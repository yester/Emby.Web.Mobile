define(["cardBuilder","apphost","imageLoader","emby-itemscontainer"],function(cardBuilder,appHost,imageLoader){"use strict";return function(view,params){function getSavedQueryKey(){return LibraryBrowser.getSavedQueryKey()}function reloadItems(page){Dashboard.showLoadingMsg();var promise="Recordings"==params.type?ApiClient.getLiveTvRecordings(query):"RecordingSeries"==params.type?ApiClient.getLiveTvRecordingSeries(query):"true"==params.IsAiring?ApiClient.getLiveTvRecommendedPrograms(query):ApiClient.getLiveTvPrograms(query);promise.then(function(result){function onNextPageClick(){query.StartIndex+=query.Limit,reloadItems(page)}function onPreviousPageClick(){query.StartIndex-=query.Limit,reloadItems(page)}window.scrollTo(0,0);var html="",pagingHtml=LibraryBrowser.getQueryPagingHtml({startIndex:query.StartIndex,limit:query.Limit,totalRecordCount:result.TotalRecordCount,showLimit:!1});page.querySelector(".listTopPaging").innerHTML=pagingHtml;var supportsImageAnalysis=appHost.supports("imageanalysis")&&("Recordings"==params.type||"RecordingSeries"==params.type);html=cardBuilder.getCardsHtml({items:result.Items,shape:query.IsMovie||"RecordingSeries"==params.type?"portrait":"backdrop",preferThumb:!query.IsMovie&&"RecordingSeries"!=params.type,inheritThumb:"Recordings"==params.type,context:"livetv",centerText:!supportsImageAnalysis,lazy:!0,overlayText:!1,showParentTitleOrTitle:!0,showTitle:!1,showParentTitle:query.IsSeries!==!1&&!query.IsMovie,showAirTime:"Recordings"!=params.type&&"RecordingSeries"!=params.type,showAirDateTime:"Recordings"!=params.type&&"RecordingSeries"!=params.type,showChannelName:"Recordings"!=params.type&&"RecordingSeries"!=params.type,overlayMoreButton:!supportsImageAnalysis,showYear:query.IsMovie&&"Recordings"==params.type,coverImage:!0,cardLayout:supportsImageAnalysis,vibrant:supportsImageAnalysis});var elem=page.querySelector(".itemsContainer");elem.innerHTML=html+pagingHtml,imageLoader.lazyChildren(elem);var i,length,elems;for(elems=page.querySelectorAll(".btnNextPage"),i=0,length=elems.length;i<length;i++)elems[i].addEventListener("click",onNextPageClick);for(elems=page.querySelectorAll(".btnPreviousPage"),i=0,length=elems.length;i<length;i++)elems[i].addEventListener("click",onPreviousPageClick);LibraryBrowser.saveQueryValues(getSavedQueryKey(),query),Dashboard.hideLoadingMsg()})}var query={UserId:Dashboard.getCurrentUserId(),StartIndex:0,Fields:"ChannelInfo"};"Recordings"==params.type?(query.IsInProgress=!1,params.groupid&&(query.GroupId=params.groupid)):"RecordingSeries"==params.type?(query.SortOrder="SortName",query.SortOrder="Ascending"):(query.HasAired=!1,query.SortBy="StartDate,SortName",query.SortOrder="Ascending"),view.addEventListener("viewbeforeshow",function(){query.ParentId=LibraryMenu.getTopParentId();var page=this,limit=LibraryBrowser.getDefaultPageSize();limit!=query.Limit&&(query.Limit=limit,query.StartIndex=0),"true"==params.IsMovie?query.IsMovie=!0:"false"==params.IsMovie&&(query.IsMovie=!1),"true"==params.IsSports?query.IsSports=!0:"false"==params.IsSports&&(query.IsSports=!1),"true"==params.IsKids?query.IsKids=!0:"false"==params.IsKids&&(query.IsKids=!1),"true"==params.IsAiring?query.IsAiring=!0:"false"==params.IsAiring&&(query.IsAiring=!1),"Recordings"==params.type?"true"==params.IsMovie?LibraryMenu.setTitle(Globalize.translate("TabMovies")):"true"==params.IsSports?LibraryMenu.setTitle(Globalize.translate("Sports")):"true"==params.IsKids?LibraryMenu.setTitle(Globalize.translate("HeaderForKids")):LibraryMenu.setTitle(Globalize.translate("TabRecordings")):"RecordingSeries"==params.type?LibraryMenu.setTitle(Globalize.translate("TabSeries")):"true"==params.IsMovie?LibraryMenu.setTitle(Globalize.translate("HeaderUpcomingMovies")):"true"==params.IsSports?LibraryMenu.setTitle(Globalize.translate("HeaderUpcomingSports")):"true"==params.IsKids?LibraryMenu.setTitle(Globalize.translate("HeaderUpcomingForKids")):"true"==params.IsAiring?LibraryMenu.setTitle(Globalize.translate("HeaderWhatsOnTV")):LibraryMenu.setTitle(Globalize.translate("HeaderUpcomingPrograms"));var viewkey=getSavedQueryKey();LibraryBrowser.loadSavedQueryValues(viewkey,query),reloadItems(page)})}});