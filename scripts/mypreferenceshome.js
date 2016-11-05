define(["listViewStyle"],function(){"use strict";function renderViews(page,user,result){var folderHtml="";folderHtml+='<div class="checkboxList">',folderHtml+=result.map(function(i){var currentHtml="",id="chkGroupFolder"+i.Id,isChecked=null!=user.Configuration.ExcludeFoldersFromGrouping&&user.Configuration.ExcludeFoldersFromGrouping.indexOf(i.Id)==-1||user.Configuration.GroupedFolders.indexOf(i.Id)!=-1,checkedHtml=isChecked?' checked="checked"':"";return currentHtml+="<label>",currentHtml+='<input type="checkbox" is="emby-checkbox" class="chkGroupFolder" data-folderid="'+i.Id+'" id="'+id+'"'+checkedHtml+"/>",currentHtml+="<span>"+i.Name+"</span>",currentHtml+="</label>"}).join(""),folderHtml+="</div>",page.querySelector(".folderGroupList").innerHTML=folderHtml}function renderLatestItems(page,user,result){var folderHtml="";folderHtml+='<div class="checkboxList">',folderHtml+=result.Items.map(function(i){var currentHtml="",id="chkIncludeInLatest"+i.Id,isChecked=user.Configuration.LatestItemsExcludes.indexOf(i.Id)==-1,checkedHtml=isChecked?' checked="checked"':"";return currentHtml+="<label>",currentHtml+='<input type="checkbox" is="emby-checkbox" class="chkIncludeInLatest" data-folderid="'+i.Id+'" id="'+id+'"'+checkedHtml+"/>",currentHtml+="<span>"+i.Name+"</span>",currentHtml+="</label>"}).join(""),folderHtml+="</div>",page.querySelector(".latestItemsList").innerHTML=folderHtml}function renderViewOrder(page,user,result){var html="",index=0;html+=result.Items.map(function(view){var currentHtml="";return currentHtml+='<div class="listItem viewItem" data-viewid="'+view.Id+'">',currentHtml+='<button type="button" is="emby-button" class="fab mini autoSize" item-icon><i class="md-icon">folder_open</i></button>',currentHtml+='<div class="listItemBody">',currentHtml+="<div>",currentHtml+=view.Name,currentHtml+="</div>",currentHtml+="</div>",index>0?currentHtml+='<button type="button" is="paper-icon-button-light" class="btnViewItemUp btnViewItemMove autoSize" title="'+Globalize.translate("ButtonUp")+'"><i class="md-icon">keyboard_arrow_up</i></button>':result.Items.length>1&&(currentHtml+='<button type="button" is="paper-icon-button-light" class="btnViewItemDown btnViewItemMove autoSize" title="'+Globalize.translate("ButtonDown")+'"><i class="md-icon">keyboard_arrow_down</i></button>'),currentHtml+="</div>",index++,currentHtml}).join(""),page.querySelector(".viewOrderList").innerHTML=html}function loadForm(page,user,displayPreferences){page.querySelector(".chkHidePlayedFromLatest").checked=user.Configuration.HidePlayedInLatest||!1,page.querySelector("#selectHomeSection1").value=displayPreferences.CustomPrefs.home0||"",page.querySelector("#selectHomeSection2").value=displayPreferences.CustomPrefs.home1||"",page.querySelector("#selectHomeSection3").value=displayPreferences.CustomPrefs.home2||"",page.querySelector("#selectHomeSection4").value=displayPreferences.CustomPrefs.home3||"";var promise1=ApiClient.getUserViews({},user.Id),promise2=ApiClient.getJSON(ApiClient.getUrl("Users/"+user.Id+"/GroupingOptions"));Promise.all([promise1,promise2]).then(function(responses){renderViews(page,user,responses[1]),renderLatestItems(page,user,responses[0]),renderViewOrder(page,user,responses[0]),Dashboard.hideLoadingMsg()})}function displayPreferencesKey(){return AppInfo.isNativeApp?"Emby Mobile":"webclient"}function getCheckboxItems(selector,page,isChecked){for(var inputs=page.querySelectorAll(selector),list=[],i=0,length=inputs.length;i<length;i++)inputs[i].checked==isChecked&&list.push(inputs[i]);return list}function saveUser(page,user,displayPreferences){user.Configuration.HidePlayedInLatest=page.querySelector(".chkHidePlayedFromLatest").checked,user.Configuration.LatestItemsExcludes=getCheckboxItems(".chkIncludeInLatest",page,!1).map(function(i){return i.getAttribute("data-folderid")}),user.Configuration.ExcludeFoldersFromGrouping=null,user.Configuration.GroupedFolders=getCheckboxItems(".chkGroupFolder",page,!0).map(function(i){return i.getAttribute("data-folderid")});for(var viewItems=page.querySelectorAll(".viewItem"),orderedViews=[],i=0,length=viewItems.length;i<length;i++)orderedViews.push(viewItems[i].getAttribute("data-viewid"));return user.Configuration.OrderedViews=orderedViews,displayPreferences.CustomPrefs.home0=page.querySelector("#selectHomeSection1").value,displayPreferences.CustomPrefs.home1=page.querySelector("#selectHomeSection2").value,displayPreferences.CustomPrefs.home2=page.querySelector("#selectHomeSection3").value,displayPreferences.CustomPrefs.home3=page.querySelector("#selectHomeSection4").value,ApiClient.updateDisplayPreferences("home",displayPreferences,user.Id,displayPreferencesKey()).then(function(){return ApiClient.updateUserConfiguration(user.Id,user.Configuration)})}function save(page,userId){Dashboard.showLoadingMsg(),AppInfo.enableAutoSave||Dashboard.showLoadingMsg(),ApiClient.getUser(userId).then(function(user){ApiClient.getDisplayPreferences("home",user.Id,displayPreferencesKey()).then(function(displayPreferences){saveUser(page,user,displayPreferences).then(function(){Dashboard.hideLoadingMsg(),AppInfo.enableAutoSave||require(["toast"],function(toast){toast(Globalize.translate("SettingsSaved"))})},function(){Dashboard.hideLoadingMsg()})})})}function parentWithClass(elem,className){for(;!elem.classList||!elem.classList.contains(className);)if(elem=elem.parentNode,!elem)return null;return elem}function getSibling(elem,type,className){for(var sibling=elem[type];null!=sibling&&!sibling.classList.contains(className););return null!=sibling&&(sibling.classList.contains(className)||(sibling=null)),sibling}return function(view,params){function onSubmit(e){return save(view,userId),e.preventDefault(),!1}var userId=getParameterByName("userId")||Dashboard.getCurrentUserId();view.querySelector(".viewOrderList").addEventListener("click",function(e){var target=parentWithClass(e.target,"btnViewItemMove"),li=parentWithClass(target,"viewItem"),ul=parentWithClass(li,"paperList");if(target.classList.contains("btnViewItemDown")){var next=li.nextSibling;li.parentNode.removeChild(li),next.parentNode.insertBefore(li,next.nextSibling)}else{var prev=li.previousSibling;li.parentNode.removeChild(li),prev.parentNode.insertBefore(li,prev)}for(var viewItems=ul.querySelectorAll(".viewItem"),i=0,length=viewItems.length;i<length;i++){var viewItem=viewItems[i],btn=viewItem.querySelector(".btnViewItemMove"),prevViewItem=getSibling(viewItem,"previousSibling","viewItem");prevViewItem?(btn.classList.add("btnViewItemUp"),btn.classList.remove("btnViewItemDown"),btn.icon="keyboard-arrow-up"):(btn.classList.remove("btnViewItemUp"),btn.classList.add("btnViewItemDown"),btn.icon="keyboard-arrow-down")}}),view.querySelector(".homeScreenPreferencesForm").addEventListener("submit",onSubmit),AppInfo.enableAutoSave?view.querySelector(".btnSave").classList.add("hide"):view.querySelector(".btnSave").classList.remove("hide"),view.addEventListener("viewshow",function(){var page=this;Dashboard.showLoadingMsg();var userId=params.userId||Dashboard.getCurrentUserId();ApiClient.getUser(userId).then(function(user){ApiClient.getDisplayPreferences("home",user.Id,displayPreferencesKey()).then(function(result){loadForm(page,user,result)})})}),view.addEventListener("viewbeforehide",function(){var page=this;AppInfo.enableAutoSave&&save(page,userId)})}});