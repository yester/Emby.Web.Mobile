define([],function(){"use strict";function reloadItems(page){Dashboard.showLoadingMsg(),Sections.loadLatestChannelItems(page.querySelector(".latestItems"),Dashboard.getCurrentUserId()).then(function(){Dashboard.hideLoadingMsg()},function(){Dashboard.hideLoadingMsg()})}function loadTab(page,index){switch(index){case 0:reloadItems(page)}}pageIdOn("pageinit","channelsPage",function(){var page=this,mdlTabs=page.querySelector(".libraryViewNav");mdlTabs.addEventListener("tabchange",function(e){loadTab(page,parseInt(e.detail.selectedTabIndex))})})});