import './TopNavigation.css';
import React, { SyntheticEvent } from 'react';
import { IconButton, Tabs, Tab, Stack } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';

import {
  HiveOutlined,
  CloseOutlined,
  OpenInNew,
  MoreVert,
  HomeOutlined,
} from '@mui/icons-material';

(window as any).frameReady = false;

let draggedTab: string | null = null;

let tabDragTimeout: number = 0;

//flag to indicate we are dragging and dropping tabs within the tabset - not tearing ouut
let internalDnD: boolean = false;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#fff',
    },
  },
});

const newTab = () => {
  window.sail.tabs.new();
};

const openChannelPicker = (event: MouseEvent) => {
  const viewInnerWidth = event.view?.innerWidth;

  const xPos = viewInnerWidth ? viewInnerWidth - 40 : event.clientX;
  const yPos = 47;

  console.log('openChannelPicker', event);

  window.sail.menu.openChannelPicker(xPos, yPos);
};

// const hideResults = () => {
//   document.dispatchEvent(new CustomEvent(RUNTIME_TOPICS.HIDE_RESULTS_WINDOW));
// };

interface NavigationTab {
  tabId: string;
  tabName: string;
}

export default class TopNavigation extends React.Component<
  {},
  {
    anchorEl: HTMLElement | null;
    tabs: Array<NavigationTab>;
    selectedTab: string;
    channelColor: string;
  }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      tabs: [],
      selectedTab: 'newTab',
      anchorEl: null,
      channelColor: '',
    };
  }

  handleTabChange(newTabId: string) {
    console.log('tab selected', newTabId);
    if (newTabId === 'newTab') {
      newTab();
    } else {
      this.setState({ selectedTab: newTabId });
      window.sail.tabs.select(newTabId);
    }
  }

  closeTab(tabId: string) {
    window.sail.tabs.close(tabId);

    this.setState({
      tabs: this.state.tabs.filter((tab: NavigationTab) => {
        return tab.tabId !== tabId;
      }),
    });
  }

  tearOut(tabId: string) {
    //only tear out if there is more than one tab in the set
    //only tear out if the 'internalDnD' flag is not set
    console.log('tearOut', tabId, this.state.tabs.length);
    if (this.state.tabs.length > 1) {
      window.sail.tabs.tearOut(tabId);
    }
  }

  handleNewTab(tabName: string, tabId: string) {
    this.setState({
      tabs: [...this.state.tabs, { tabId: tabId, tabName: tabName }],
      selectedTab: tabId,
    });
  }

  componentDidMount() {
    document.addEventListener(RUNTIME_TOPICS.ADD_TAB, ((event: CustomEvent) => {
      console.log('Add Tab called', event.detail);
      const tabId = event.detail.viewId;
      const tabName = event.detail.title;
      this.handleNewTab(tabName, tabId);

      const content = document.createElement('div');
      content.id = `content_${tabId}`;
      content.className = 'content';
      const contentContainer = document.getElementById('contentContainer');
      if (contentContainer) {
        contentContainer.appendChild(content);
        //select the new Tab?
        //selectTab(tabId);
      }
    }) as EventListener);

    document.addEventListener(RUNTIME_TOPICS.REMOVE_TAB, ((
      event: CustomEvent,
    ) => {
      console.log('Remove Tab called', event.detail);
      const tabId = event.detail.tabId;
      this.setState({
        tabs: this.state.tabs.filter((tab) => {
          return tab.tabId !== tabId;
        }),
      });
    }) as EventListener);

    document.addEventListener(RUNTIME_TOPICS.SELECT_TAB, ((
      event: CustomEvent,
    ) => {
      if (event.detail.selected) {
        this.setState({ selectedTab: event.detail.selected });
      }
    }) as EventListener);

    document.addEventListener(RUNTIME_TOPICS.CHANNEL_SELECTED, ((
      event: CustomEvent,
    ) => {
      this.setState({
        channelColor: event.detail?.channel?.displayMetadata?.color,
      });
    }) as EventListener);

    window.sail.isReady();
  }

  render() {
    const open = Boolean(this.state.anchorEl);

    // const debounce = (callback: any, wait: number) => {
    //   let timeoutId: number | undefined = undefined;
    //   return (...args: any[]) => {
    //     window.clearTimeout(timeoutId);
    //     timeoutId = window.setTimeout(() => {
    //       callback.apply(null, args);
    //     }, wait);
    //   };
    // };

    // const searchChange = debounce((event: InputEvent) => {
    //   const threshold = 3;
    //   const input: HTMLInputElement = event.target as HTMLInputElement;

    //   const value = input && input.value ? input.value : '';
    //   //does the value meet the threshold
    //   if (value && value.length >= threshold) {
    //     window.sail.search.searchDirectory(value);
    //   }
    // }, 400);

    const devToolsClick = (event: SyntheticEvent) => {
      window.sail.menu.openTools(
        (event.nativeEvent as PointerEvent).clientX,
        (event.nativeEvent as PointerEvent).clientY,
      );
    };

    const allowDrop = (ev: SyntheticEvent) => {
      ev.preventDefault();
      if (tabDragTimeout > 0) {
        window.clearTimeout(tabDragTimeout);
        tabDragTimeout = 0;
      }
      //internalDnD = false;
    };

    // const allowFrameDrop = (ev: SyntheticEvent) => {
    //   ev.preventDefault();
    // };

    const drag = (tabId: string) => {
      //start with internal drag and drop operation assumed
      internalDnD = true;
      draggedTab = tabId;
      //inform of the tab dragstart
      window.sail.tabs.dragStart(tabId);
    };

    const drop = (ev: SyntheticEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      const target: HTMLElement = ev.target as HTMLElement;
      console.log('tabDrop', ev, target, target.id);
      if (internalDnD && draggedTab && target) {
        const tabId = draggedTab;
        //rewrite the tablist
        //find the selected tab, and pop it out of the list

        let dropTab: NavigationTab | undefined = undefined;
        let targetIndex = 0;
        const newTabList: Array<NavigationTab> = [];

        this.state.tabs.forEach((tab, i) => {
          if (tab.tabId !== tabId) {
            newTabList.push(tab);
          } else {
            dropTab = tab;
          }
          if (tab.tabId === target.id) {
            targetIndex = i;
          }
        });

        if (dropTab) {
          newTabList.splice(targetIndex, 0, dropTab);
        }
        this.setState({ tabs: newTabList });
        //select the dragged tab
        //do this with a delay to prevent race conditions with re-rendering the tab order
        setTimeout(() => {
          window.sail.tabs.select(tabId);
        }, 100);

        draggedTab = null;
        internalDnD = false;
      } else {
        //raise drop event for tear out
        window.sail.tabs.drop(true);
      }
    };

    // const frameDrop = (ev: SyntheticEvent) => {
    //   ev.preventDefault();
    //   ev.stopPropagation();
    //   console.log('tabDropped on frame target');
    //   window.sail.tabs.drop(true);
    // };

    const leaveTab = () => {
      tabDragTimeout = window.setTimeout(() => {
        internalDnD = false;
      }, 300);
    };

    const dragEnd = (ev: SyntheticEvent) => {
      ev.preventDefault();
    };

    return (
      <ThemeProvider theme={darkTheme}>
        <div className="window-draggable"></div>
        <div>
          <Stack
            direction={'row'}
            alignContent={'center'}
            alignItems="center"
            className="h-12 bg-[#383838] pl-24 content-center"
          >
            <div className="verticalLineGrey"></div>

            {/* <img
              alt="FDC3 Sail"
              src="sail_logo.png"
              className="h-9 mr-6 self-center"
            /> */}

            <div>
              <IconButton aria-label="home" className="h-6 w-6">
                <HomeOutlined className="text-xs" />
              </IconButton>
            </div>
            <div className="verticalLineBlack"></div>

            <Tabs
              className="w-full h-full"
              value={this.state.selectedTab}
              onChange={(event, newTabId) => {
                this.handleTabChange(newTabId);
              }}
              variant="scrollable"
              scrollButtons="auto"
            >
              {this.state.tabs.map((tab: NavigationTab) => (
                <Tab
                  className="tabStyle"
                  style={{ minHeight: '50px' }}
                  label={tab.tabName}
                  value={tab.tabId}
                  id={tab.tabId}
                  key={tab.tabId}
                  iconPosition="end"
                  onDrop={drop}
                  onDragLeave={leaveTab}
                  onDragOver={allowDrop}
                  onDragEnd={dragEnd}
                  draggable="true"
                  onDragStart={() => {
                    drag(tab.tabId);
                  }}
                  icon={
                    <div>
                      <OpenInNew
                        onClick={() => {
                          this.tearOut(tab.tabId);
                        }}
                      />
                      <CloseOutlined
                        onClick={() => {
                          this.closeTab(tab.tabId);
                        }}
                      />
                    </div>
                  }
                />
              ))}
            </Tabs>
            <IconButton
              size="small"
              id="channelPicker"
              sx={{
                background: this.state.channelColor,
              }}
              onClick={openChannelPicker}
              title="select channel"
            >
              <HiveOutlined />
            </IconButton>
            <IconButton
              id="menuButton"
              aria-controls={open ? 'more' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={devToolsClick}
              style={{ backgroundColor: 'transparent' }}
            >
              <MoreVert />
            </IconButton>
          </Stack>
        </div>
      </ThemeProvider>
    );
  }
}
