define(["appSettings","userSettings","appStorage","datetime","browser"],function(appSettings,userSettings,appStorage,datetime,browser){"use strict";function mediaPlayer(){function canPlayerSeek(){var mediaRenderer=self.currentMediaRenderer,currentSrc=(self.getCurrentSrc(mediaRenderer)||"").toLowerCase();if(currentSrc.indexOf(".m3u8")!=-1)return!0;var duration=mediaRenderer.duration();return duration&&!isNaN(duration)&&duration!=Number.POSITIVE_INFINITY&&duration!=Number.NEGATIVE_INFINITY}function getProfileOptions(item){var options={};if(!AppInfo.isNativeApp){var disableHlsVideoAudioCodecs=[];self.canPlayNativeHls()||disableHlsVideoAudioCodecs.push("mp3"),item.RunTimeTicks||disableHlsVideoAudioCodecs.push("ac3"),options.enableMkvProgressive=null!=item.RunTimeTicks,null==item.RunTimeTicks&&(options.enableHls=!0),options.enableMkvProgressive=!1,options.disableHlsVideoAudioCodecs=disableHlsVideoAudioCodecs}return options}function changeStreamToUrl(mediaRenderer,playSessionId,streamInfo){function onPlayingOnce(){Events.off(mediaRenderer,"play",onPlayingOnce),Events.on(mediaRenderer,"ended",self.onPlaybackStopped),Events.on(mediaRenderer,"ended",self.playNextAfterEnded),self.startProgressInterval(),sendProgressUpdate()}clearProgressInterval(),Events.off(mediaRenderer,"ended",self.onPlaybackStopped),Events.off(mediaRenderer,"ended",self.playNextAfterEnded),Events.on(mediaRenderer,"play",onPlayingOnce),"Video"==self.currentItem.MediaType?ApiClient.stopActiveEncodings(playSessionId).then(function(){self.setSrcIntoRenderer(mediaRenderer,streamInfo,self.currentItem,self.currentMediaSource)}):self.setSrcIntoRenderer(mediaRenderer,streamInfo,self.currentItem,self.currentMediaSource)}function translateItemsForPlayback(items,smart){var promise,firstItem=items[0];return"Playlist"==firstItem.Type?promise=self.getItemsForPlayback({ParentId:firstItem.Id}):"MusicArtist"==firstItem.Type?promise=self.getItemsForPlayback({ArtistIds:firstItem.Id,Filters:"IsNotFolder",Recursive:!0,SortBy:"SortName",MediaTypes:"Audio"}):"MusicGenre"==firstItem.Type?promise=self.getItemsForPlayback({Genres:firstItem.Name,Filters:"IsNotFolder",Recursive:!0,SortBy:"SortName",MediaTypes:"Audio"}):firstItem.IsFolder?promise=self.getItemsForPlayback({ParentId:firstItem.Id,Filters:"IsNotFolder",Recursive:!0,SortBy:"SortName",MediaTypes:"Audio,Video"}):smart&&"Episode"==firstItem.Type&&1==items.length&&(promise=ApiClient.getCurrentUser().then(function(user){return user.Configuration.EnableNextEpisodeAutoPlay&&firstItem.SeriesId?ApiClient.getEpisodes(firstItem.SeriesId,{IsVirtualUnaired:!1,IsMissing:!1,UserId:ApiClient.getCurrentUserId(),Fields:getItemFields}).then(function(episodesResult){var foundItem=!1;return episodesResult.Items=episodesResult.Items.filter(function(e){return!!foundItem||e.Id==firstItem.Id&&(foundItem=!0,!0)}),episodesResult.TotalRecordCount=episodesResult.Items.length,episodesResult}):null})),promise?promise.then(function(result){return result?result.Items:items}):Promise.resolve(items)}function getOptimalMediaSource(mediaType,versions){var promises=versions.map(function(v){return MediaController.supportsDirectPlay(v)});return Promise.all(promises).then(function(responses){for(var i=0,length=versions.length;i<length;i++)versions[i].enableDirectPlay=responses[i]||!1;var optimalVersion=versions.filter(function(v){return v.enableDirectPlay})[0];return optimalVersion||(optimalVersion=versions.filter(function(v){return v.SupportsDirectStream})[0]),optimalVersion=optimalVersion||versions.filter(function(s){return s.SupportsTranscoding})[0]})}function playOnDeviceProfileCreated(deviceProfile,item,startPosition,callback){self.tryStartPlayback(deviceProfile,item,startPosition,function(mediaSource){playInternalPostMediaSourceSelection(item,mediaSource,startPosition,callback)})}function playInternalPostMediaSourceSelection(item,mediaSource,startPosition,callback){Dashboard.hideLoadingMsg(),self.currentMediaSource=mediaSource,self.currentItem=item,"Video"===item.MediaType?requirejs(["videorenderer","scripts/mediaplayer-video"],function(){self.playVideo(item,self.currentMediaSource,startPosition,callback)}):"Audio"===item.MediaType&&playAudio(item,self.currentMediaSource,startPosition,callback)}function validatePlaybackInfoResult(result){return!result.ErrorCode||(MediaController.showPlaybackInfoErrorMessage(result.ErrorCode),!1)}function unBindAudioEvents(mediaRenderer){Events.off(mediaRenderer,"volumechange",onVolumeChange),Events.off(mediaRenderer,"pause",onPause),Events.off(mediaRenderer,"playing",onPlaying),Events.off(mediaRenderer,"timeupdate",onTimeUpdate)}function onAppClose(){self.currentItem&&self.currentMediaRenderer&&(currentProgressInterval?self.onPlaybackStopped.call(self.currentMediaRenderer):ApiClient.stopActiveEncodings())}function sendProgressUpdate(){var mediaRenderer=self.currentMediaRenderer;if(mediaRenderer.enableProgressReporting!==!1){var state=self.getPlayerStateInternal(mediaRenderer,self.currentItem,self.currentMediaSource),info={QueueableMediaTypes:state.NowPlayingItem.MediaType,ItemId:state.NowPlayingItem.Id,NowPlayingItem:state.NowPlayingItem};info=Object.assign(info,state.PlayState),ApiClient.reportPlaybackProgress(info)}}function clearProgressInterval(){currentProgressInterval&&(clearTimeout(currentProgressInterval),currentProgressInterval=null)}function onTimeUpdate(){var currentTicks=self.getCurrentTicks(this);self.setCurrentTime(currentTicks)}function playAudio(item,mediaSource,startPositionTicks,callback){requirejs(["audiorenderer"],function(){playAudioInternal(item,mediaSource,startPositionTicks),callback&&callback()})}function playAudioInternal(item,mediaSource,startPositionTicks){self.createStreamInfo("Audio",item,mediaSource,startPositionTicks).then(function(streamInfo){function onPlayingOnce(){Events.off(mediaRenderer,"playing",onPlayingOnce),console.log("audio element event: playing"),Events.on(mediaRenderer,"ended",self.onPlaybackStopped),Events.on(mediaRenderer,"ended",self.playNextAfterEnded),self.onPlaybackStart(mediaRenderer,item,mediaSource)}self.startTimeTicksOffset=streamInfo.startTimeTicksOffset;var initialVolume=self.getSavedVolume(),mediaRenderer=new AudioRenderer({poster:self.getPosterUrl(item)});Events.on(mediaRenderer,"volumechange",onVolumeChange),Events.on(mediaRenderer,"playing",onPlayingOnce),Events.on(mediaRenderer,"pause",onPause),Events.on(mediaRenderer,"playing",onPlaying),Events.on(mediaRenderer,"timeupdate",onTimeUpdate),self.currentMediaRenderer=mediaRenderer,mediaRenderer.init().then(function(){mediaRenderer.volume(initialVolume),self.onBeforePlaybackStart(mediaRenderer,item,mediaSource),mediaRenderer.setCurrentSrc(streamInfo,item,mediaSource),self.streamInfo=streamInfo})})}function onVolumeChange(){console.log("audio element event: pause"),self.onPlaystateChange(this),self.setCurrentTime(self.getCurrentTicks())}function onPause(){console.log("audio element event: pause"),self.onPlaystateChange(this),self.setCurrentTime(self.getCurrentTicks())}function onPlaying(){console.log("audio element event: playing"),self.onPlaystateChange(this),self.setCurrentTime(self.getCurrentTicks())}var currentProgressInterval,self=this,currentPlaylistIndex=-1;self.currentMediaRenderer=null,self.currentItem=null,self.currentMediaSource=null,self.startTimeTicksOffset=null,self.playlist=[],self.isLocalPlayer=!0,self.isDefaultPlayer=!0,self.streamInfo={},self.name="Html5 Player",self.getTargets=function(){return new Promise(function(resolve,reject){resolve(self.getTargetsInternal())})},self.getTargetsInternal=function(){var targets=[{name:Globalize.translate("MyDevice"),id:ConnectionManager.deviceId(),playerName:self.name,playableMediaTypes:["Audio","Video"],isLocalPlayer:!0,supportedCommands:Dashboard.getSupportedRemoteCommands()}];return targets};var supportsTextTracks;self.supportsTextTracks=function(){return null==supportsTextTracks&&(supportsTextTracks=null!=document.createElement("video").textTracks),supportsTextTracks},self.getCurrentSrc=function(mediaRenderer){return mediaRenderer.currentSrc()},self.getCurrentTicks=function(mediaRenderer){var playerTime=Math.floor(1e4*(mediaRenderer||self.currentMediaRenderer).currentTime());return playerTime+=self.startTimeTicksOffset},self.playNextAfterEnded=function(){console.log("playNextAfterEnded"),Events.off(this,"ended",self.playNextAfterEnded),self.nextTrack()},self.startProgressInterval=function(){clearProgressInterval();var intervalTime=ApiClient.isWebSocketOpen()?1200:5e3;browser.safari&&(intervalTime=Math.max(intervalTime,5e3)),self.lastProgressReport=0,currentProgressInterval=setInterval(function(){self.currentMediaRenderer&&(new Date).getTime()-self.lastProgressReport>intervalTime&&(self.lastProgressReport=(new Date).getTime(),sendProgressUpdate())},250)},self.getCurrentMediaExtension=function(currentSrc){return currentSrc=currentSrc.split("?")[0],currentSrc.substring(currentSrc.lastIndexOf("."))},self.canPlayNativeHls=function(){if(AppInfo.isNativeApp)return!0;var media=document.createElement("video");return!(!media.canPlayType("application/x-mpegURL").replace(/no/,"")&&!media.canPlayType("application/vnd.apple.mpegURL").replace(/no/,""))},self.canPlayHls=function(){return!!self.canPlayNativeHls()||null!=window.MediaSource},self.changeStream=function(ticks,params){var mediaRenderer=self.currentMediaRenderer;if(canPlayerSeek()&&null==params)return void mediaRenderer.currentTime(ticks/1e4);params=params||{};var currentSrc=mediaRenderer.currentSrc(),playSessionId=getParameterByName("PlaySessionId",currentSrc),liveStreamId=getParameterByName("LiveStreamId",currentSrc);Dashboard.getDeviceProfile(null,getProfileOptions(self.currentMediaSource)).then(function(deviceProfile){var audioStreamIndex=null==params.AudioStreamIndex?getParameterByName("AudioStreamIndex",currentSrc)||null:params.AudioStreamIndex;"string"==typeof audioStreamIndex&&(audioStreamIndex=parseInt(audioStreamIndex));var subtitleStreamIndex=null==params.SubtitleStreamIndex?getParameterByName("SubtitleStreamIndex",currentSrc)||null:params.SubtitleStreamIndex;"string"==typeof subtitleStreamIndex&&(subtitleStreamIndex=parseInt(subtitleStreamIndex)),MediaController.getPlaybackInfo(self.currentItem.Id,deviceProfile,ticks,self.currentMediaSource,audioStreamIndex,subtitleStreamIndex,liveStreamId).then(function(result){validatePlaybackInfoResult(result)&&(self.currentMediaSource=result.MediaSources[0],self.createStreamInfo(self.currentItem.MediaType,self.currentItem,self.currentMediaSource,ticks).then(function(streamInfo){return streamInfo.url?(self.currentSubtitleStreamIndex=subtitleStreamIndex,void changeStreamToUrl(mediaRenderer,playSessionId,streamInfo)):(MediaController.showPlaybackInfoErrorMessage("NoCompatibleStream"),void self.stop())}))})})},self.setSrcIntoRenderer=function(mediaRenderer,streamInfo,item,mediaSource){for(var subtitleStreams=mediaSource.MediaStreams.filter(function(s){return"Subtitle"==s.Type}),textStreams=subtitleStreams.filter(function(s){return"External"==s.DeliveryMethod}),tracks=[],i=0,length=textStreams.length;i<length;i++){var textStream=textStreams[i],textStreamUrl=textStream.IsExternalUrl?textStream.DeliveryUrl:ApiClient.getUrl(textStream.DeliveryUrl);tracks.push({url:textStreamUrl,language:textStream.Language||"und",isDefault:textStream.Index==mediaSource.DefaultSubtitleStreamIndex,index:textStream.Index,format:textStream.Codec})}self.startTimeTicksOffset=streamInfo.startTimeTicksOffset||0,mediaRenderer.setCurrentSrc(streamInfo,item,mediaSource,tracks),self.streamInfo=streamInfo},self.getSeekableDurationTicks=function(){if(self.currentMediaSource&&self.currentMediaSource.RunTimeTicks)return self.currentMediaSource.RunTimeTicks;if(self.currentMediaRenderer){var duration=self.currentMediaRenderer.duration();if(duration)return 1e4*duration}return null},self.setCurrentTime=function(ticks,positionSlider,currentTimeElement){ticks=Math.floor(ticks);var timeText=datetime.getDisplayRunningTime(ticks),mediaRenderer=self.currentMediaRenderer,seekableDurationTicks=self.getSeekableDurationTicks();if(seekableDurationTicks&&(timeText+=" / "+datetime.getDisplayRunningTime(seekableDurationTicks),positionSlider)){var percent=ticks/seekableDurationTicks;percent*=100,positionSlider.value=percent}positionSlider&&(positionSlider.disabled=!((seekableDurationTicks||0)>0||canPlayerSeek())),currentTimeElement&&(currentTimeElement.innerHTML=timeText);var state=self.getPlayerStateInternal(mediaRenderer,self.currentItem,self.currentMediaSource);Events.trigger(self,"positionchange",[state])},self.canQueueMediaType=function(mediaType){return self.currentItem&&self.currentItem.MediaType==mediaType},self.play=function(options){return Dashboard.showLoadingMsg(),Dashboard.getCurrentUser().then(function(user){return options.items?translateItemsForPlayback(options.items,!0).then(function(items){return self.playWithIntros(items,options,user)}):self.getItemsForPlayback({Ids:options.ids.join(",")}).then(function(result){return translateItemsForPlayback(result.Items,!0).then(function(items){return self.playWithIntros(items,options,user)})})})},self.playWithIntros=function(items,options,user){var firstItem=items[0];return"Video"===firstItem.MediaType&&Dashboard.showLoadingMsg(),options.startPositionTicks||"Video"!==firstItem.MediaType||!userSettings.enableCinemaMode()?void self.playInternal(firstItem,options.startPositionTicks,function(){self.setPlaylistState(0,items)}):(ApiClient.getJSON(ApiClient.getUrl("Users/"+user.Id+"/Items/"+firstItem.Id+"/Intros")).then(function(intros){items=intros.Items.concat(items),self.playInternal(items[0],options.startPositionTicks,function(){self.setPlaylistState(0,items)})}),Promise.resolve())},self.createStreamInfo=function(type,item,mediaSource,startPosition){return new Promise(function(resolve,reject){var mediaUrl,contentType,startTimeTicksOffset=0,startPositionInSeekParam=startPosition?startPosition/1e7:0,seekParam=startPositionInSeekParam?"#t="+startPositionInSeekParam:"",playMethod="Transcode";if("Video"==type)if(contentType="video/"+mediaSource.Container,mediaSource.enableDirectPlay)mediaUrl=mediaSource.Path,playMethod="DirectPlay";else if(mediaSource.SupportsDirectStream){var directOptions={Static:!0,mediaSourceId:mediaSource.Id,deviceId:ApiClient.deviceId(),api_key:ApiClient.accessToken()};mediaSource.ETag&&(directOptions.Tag=mediaSource.ETag),mediaSource.LiveStreamId&&(directOptions.LiveStreamId=mediaSource.LiveStreamId),mediaUrl=ApiClient.getUrl("Videos/"+item.Id+"/stream."+mediaSource.Container,directOptions),mediaUrl+=seekParam,playMethod="DirectStream"}else mediaSource.SupportsTranscoding&&(mediaUrl=ApiClient.getUrl(mediaSource.TranscodingUrl),"hls"==mediaSource.TranscodingSubProtocol?contentType="application/x-mpegURL":(mediaUrl.toLowerCase().indexOf("copytimestamps=true")==-1&&(startPositionInSeekParam=0,startTimeTicksOffset=startPosition||0),contentType="video/"+mediaSource.TranscodingContainer));else if(contentType="audio/"+mediaSource.Container,mediaSource.enableDirectPlay)mediaUrl=mediaSource.Path,playMethod="DirectPlay";else{var isDirectStream=mediaSource.SupportsDirectStream;if(isDirectStream){var outputContainer=(mediaSource.Container||"").toLowerCase(),directOptions={Static:!0,mediaSourceId:mediaSource.Id,deviceId:ApiClient.deviceId(),api_key:ApiClient.accessToken()};mediaSource.ETag&&(directOptions.Tag=mediaSource.ETag),mediaSource.LiveStreamId&&(directOptions.LiveStreamId=mediaSource.LiveStreamId),mediaUrl=ApiClient.getUrl("Audio/"+item.Id+"/stream."+outputContainer,directOptions),mediaUrl+=seekParam,playMethod="DirectStream"}else mediaSource.SupportsTranscoding&&(mediaUrl=ApiClient.getUrl(mediaSource.TranscodingUrl),"hls"==mediaSource.TranscodingSubProtocol?(mediaUrl+=seekParam,contentType="application/x-mpegURL"):(startTimeTicksOffset=startPosition||0,contentType="audio/"+mediaSource.TranscodingContainer))}var resultInfo={url:mediaUrl,mimeType:contentType,startTimeTicksOffset:startTimeTicksOffset,startPositionInSeekParam:startPositionInSeekParam,playMethod:playMethod};"DirectPlay"==playMethod&&"File"==mediaSource.Protocol?require(["localassetmanager"],function(LocalAssetManager){LocalAssetManager.translateFilePath(resultInfo.url).then(function(path){resultInfo.url=path,console.log("LocalAssetManager.translateFilePath: path: "+resultInfo.url+" result: "+path),resolve(resultInfo)})}):resolve(resultInfo)})},self.lastBitrateDetections={},self.playInternal=function(item,startPosition,callback){if(null==item)throw new Error("item cannot be null");if(self.isPlaying()&&self.stop(!1),"Audio"!==item.MediaType&&"Video"!==item.MediaType)throw new Error("Unrecognized media type");if(item.IsPlaceHolder)return Dashboard.hideLoadingMsg(),void MediaController.showPlaybackInfoErrorMessage("PlaceHolder");var onBitrateDetected=function(){Dashboard.getDeviceProfile(null,getProfileOptions(item)).then(function(deviceProfile){playOnDeviceProfileCreated(deviceProfile,item,startPosition,callback)})},bitrateDetectionKey=ApiClient.serverAddress();"Video"==item.MediaType&&appSettings.enableAutomaticBitrateDetection()&&(new Date).getTime()-(self.lastBitrateDetections[bitrateDetectionKey]||0)>3e5?(Dashboard.showLoadingMsg(),ApiClient.detectBitrate().then(function(bitrate){console.log("Max bitrate auto detected to "+bitrate),self.lastBitrateDetections[bitrateDetectionKey]=(new Date).getTime(),appSettings.maxStreamingBitrate(bitrate),onBitrateDetected()},onBitrateDetected)):onBitrateDetected()},self.tryStartPlayback=function(deviceProfile,item,startPosition,callback){"Video"===item.MediaType&&Dashboard.showLoadingMsg(),MediaController.getPlaybackInfo(item.Id,deviceProfile,startPosition).then(function(playbackInfoResult){validatePlaybackInfoResult(playbackInfoResult)&&getOptimalMediaSource(item.MediaType,playbackInfoResult.MediaSources).then(function(mediaSource){mediaSource?mediaSource.RequiresOpening?MediaController.getLiveStream(item.Id,playbackInfoResult.PlaySessionId,deviceProfile,startPosition,mediaSource,null,null).then(function(openLiveStreamResult){MediaController.supportsDirectPlay(openLiveStreamResult.MediaSource).then(function(result){openLiveStreamResult.MediaSource.enableDirectPlay=result,callback(openLiveStreamResult.MediaSource)})}):callback(mediaSource):(Dashboard.hideLoadingMsg(),MediaController.showPlaybackInfoErrorMessage("NoCompatibleStream"))})})},self.getPosterUrl=function(item){var screenWidth=Math.max(screen.height,screen.width);return item.BackdropImageTags&&item.BackdropImageTags.length?ApiClient.getScaledImageUrl(item.Id,{type:"Backdrop",index:0,maxWidth:screenWidth,tag:item.BackdropImageTags[0]}):item.ParentBackdropItemId&&item.ParentBackdropImageTags&&item.ParentBackdropImageTags.length?ApiClient.getScaledImageUrl(item.ParentBackdropItemId,{type:"Backdrop",index:0,maxWidth:screenWidth,tag:item.ParentBackdropImageTags[0]}):null},self.displayContent=function(cmd){var apiClient=ApiClient;apiClient.getItem(apiClient.getCurrentUserId(),cmd.ItemId).then(function(item){require(["embyRouter"],function(embyRouter){embyRouter.showItem(item)})})},self.getItemsForPlayback=function(query){var userId=Dashboard.getCurrentUserId();return query.Ids&&1==query.Ids.split(",").length?new Promise(function(resolve,reject){ApiClient.getItem(userId,query.Ids.split(",")).then(function(item){resolve({Items:[item],TotalRecordCount:1})})}):(query.Limit=query.Limit||100,query.Fields=getItemFields,query.ExcludeLocationTypes="Virtual",ApiClient.getItems(userId,query))},self.removeFromPlaylist=function(index){self.playlist.remove(index)},self.currentPlaylistIndex=function(i){if(null==i)return currentPlaylistIndex;var newItem=self.playlist[i];self.playInternal(newItem,0,function(){self.setPlaylistState(i)})},self.setPlaylistState=function(i,items){isNaN(i)||(currentPlaylistIndex=i),items&&(self.playlist=items),self.updatePlaylistUi&&self.updatePlaylistUi()},self.nextTrack=function(){var newIndex;switch(self.getRepeatMode()){case"RepeatOne":newIndex=currentPlaylistIndex;break;case"RepeatAll":newIndex=currentPlaylistIndex+1,newIndex>=self.playlist.length&&(newIndex=0);break;default:newIndex=currentPlaylistIndex+1}var newItem=self.playlist[newIndex];newItem&&(console.log("playing next track"),self.playInternal(newItem,0,function(){self.setPlaylistState(newIndex)}))},self.previousTrack=function(){var newIndex=currentPlaylistIndex-1;if(newIndex>=0){var newItem=self.playlist[newIndex];newItem&&self.playInternal(newItem,0,function(){self.setPlaylistState(newIndex)})}},self.queueItemsNext=function(items){for(var insertIndex=1,i=0,length=items.length;i<length;i++)self.playlist.splice(insertIndex,0,items[i]),insertIndex++},self.queueItems=function(items){for(var i=0,length=items.length;i<length;i++)self.playlist.push(items[i])},self.queue=function(options){return self.playlist.length?void Dashboard.getCurrentUser().then(function(user){options.items?translateItemsForPlayback(options.items).then(function(items){self.queueItems(items)}):self.getItemsForPlayback({Ids:options.ids.join(",")}).then(function(result){translateItemsForPlayback(result.Items).then(function(items){self.queueItems(items)})})}):void self.play(options)},self.queueNext=function(options){return self.playlist.length?void Dashboard.getCurrentUser().then(function(user){options.items?self.queueItemsNext(options.items):self.getItemsForPlayback({Ids:options.ids.join(",")}).then(function(result){options.items=result.Items,self.queueItemsNext(options.items)})}):void self.play(options)},self.pause=function(){self.currentMediaRenderer.pause()},self.unpause=function(){self.currentMediaRenderer.unpause()},self.seek=function(position){self.changeStream(position)},self.mute=function(){self.setVolume(0)},self.unMute=function(){self.setVolume(100*self.getSavedVolume())},self.volume=function(){return 100*self.currentMediaRenderer.volume()},self.toggleMute=function(){self.currentMediaRenderer&&(console.log("MediaPlayer toggling mute"),self.volume()?self.mute():self.unMute())},self.volumeDown=function(){self.currentMediaRenderer&&self.setVolume(Math.max(self.volume()-2,0))},self.volumeUp=function(){self.currentMediaRenderer&&self.setVolume(Math.min(self.volume()+2,100))},self.setVolume=function(val){self.currentMediaRenderer&&(console.log("MediaPlayer setting volume to "+val),self.currentMediaRenderer.volume(val/100),self.onVolumeChanged(self.currentMediaRenderer))},self.saveVolume=function(val){val&&appStorage.setItem("volume",val)},self.getSavedVolume=function(){return appStorage.getItem("volume")||.5},self.shuffle=function(id){var userId=Dashboard.getCurrentUserId();ApiClient.getItem(userId,id).then(function(item){var query={UserId:userId,Fields:getItemFields,Limit:100,Filters:"IsNotFolder",Recursive:!0,SortBy:"Random"};if("MusicArtist"==item.Type)query.MediaTypes="Audio",query.ArtistIds=item.Id;else if("MusicGenre"==item.Type)query.MediaTypes="Audio",query.Genres=item.Name;else{if(!item.IsFolder)return;query.ParentId=id}self.getItemsForPlayback(query).then(function(result){self.play({items:result.Items})})})},self.instantMix=function(id){var itemLimit=100;ApiClient.getInstantMixFromItem(id,{UserId:Dashboard.getCurrentUserId(),Fields:getItemFields,Limit:itemLimit}).then(function(result){self.play({items:result.Items})})},self.stop=function(destroyRenderer){var mediaRenderer=self.currentMediaRenderer;if(mediaRenderer){Events.off(mediaRenderer,"ended",self.playNextAfterEnded);var stopTranscoding=!1;currentProgressInterval||(stopTranscoding=!0),mediaRenderer.stop(),Events.trigger(mediaRenderer,"ended"),unBindAudioEvents(mediaRenderer),mediaRenderer.cleanup(destroyRenderer),self.currentMediaRenderer=null,self.currentItem=null,self.currentSubtitleStreamIndex=null,self.streamInfo={},self.currentMediaSource=null,stopTranscoding&&ApiClient.stopActiveEncodings()}else self.currentMediaRenderer=null,self.currentItem=null,self.currentMediaSource=null,self.currentSubtitleStreamIndex=null,self.streamInfo={};self.resetEnhancements&&self.resetEnhancements()},self.isPlaying=function(){return self.playlist.length>0},self.getPlayerState=function(){return new Promise(function(resolve,reject){var result=self.getPlayerStateInternal(self.currentMediaRenderer,self.currentItem,self.currentMediaSource);resolve(result)})},self.getPlayerStateInternal=function(mediaRenderer,item,mediaSource){var state={PlayState:{}};if(mediaRenderer){state.PlayState.VolumeLevel=100*mediaRenderer.volume(),state.PlayState.IsMuted=0==mediaRenderer.volume(),state.PlayState.IsPaused=mediaRenderer.paused(),state.PlayState.PositionTicks=self.getCurrentTicks(mediaRenderer),state.PlayState.RepeatMode=self.getRepeatMode();var currentSrc=mediaRenderer.currentSrc();if(currentSrc){var audioStreamIndex=getParameterByName("AudioStreamIndex",currentSrc);audioStreamIndex&&(state.PlayState.AudioStreamIndex=parseInt(audioStreamIndex)),state.PlayState.SubtitleStreamIndex=self.currentSubtitleStreamIndex,state.PlayState.PlayMethod=self.streamInfo.playMethod,state.PlayState.PlaySessionId=getParameterByName("PlaySessionId",currentSrc)}}return mediaSource&&(state.PlayState.MediaSourceId=mediaSource.Id,state.PlayState.LiveStreamId=mediaSource.LiveStreamId,state.NowPlayingItem={RunTimeTicks:mediaSource.RunTimeTicks},state.PlayState.CanSeek=(mediaSource.RunTimeTicks||0)>0||canPlayerSeek()),item&&(state.NowPlayingItem=self.getNowPlayingItemForReporting(item,mediaSource)),state},self.getNowPlayingItemForReporting=function(item,mediaSource){var nowPlayingItem={};nowPlayingItem.RunTimeTicks=mediaSource.RunTimeTicks,nowPlayingItem.Id=item.Id,nowPlayingItem.MediaType=item.MediaType,nowPlayingItem.Type=item.Type,nowPlayingItem.Name=item.Name,nowPlayingItem.IndexNumber=item.IndexNumber,nowPlayingItem.IndexNumberEnd=item.IndexNumberEnd,nowPlayingItem.ParentIndexNumber=item.ParentIndexNumber,nowPlayingItem.ProductionYear=item.ProductionYear,nowPlayingItem.PremiereDate=item.PremiereDate,nowPlayingItem.SeriesName=item.SeriesName,nowPlayingItem.Album=item.Album,nowPlayingItem.AlbumId=item.AlbumId,nowPlayingItem.Artists=item.Artists,nowPlayingItem.ArtistItems=item.ArtistItems;var imageTags=item.ImageTags||{};return item.SeriesPrimaryImageTag?(nowPlayingItem.PrimaryImageItemId=item.SeriesId,nowPlayingItem.PrimaryImageTag=item.SeriesPrimaryImageTag):imageTags.Primary?(nowPlayingItem.PrimaryImageItemId=item.Id,nowPlayingItem.PrimaryImageTag=imageTags.Primary):item.AlbumPrimaryImageTag?(nowPlayingItem.PrimaryImageItemId=item.AlbumId,nowPlayingItem.PrimaryImageTag=item.AlbumPrimaryImageTag):item.SeriesPrimaryImageTag&&(nowPlayingItem.PrimaryImageItemId=item.SeriesId,nowPlayingItem.PrimaryImageTag=item.SeriesPrimaryImageTag),item.BackdropImageTags&&item.BackdropImageTags.length?(nowPlayingItem.BackdropItemId=item.Id,nowPlayingItem.BackdropImageTag=item.BackdropImageTags[0]):item.ParentBackdropImageTags&&item.ParentBackdropImageTags.length&&(nowPlayingItem.BackdropItemId=item.ParentBackdropItemId,nowPlayingItem.BackdropImageTag=item.ParentBackdropImageTags[0]),imageTags.Thumb&&(nowPlayingItem.ThumbItemId=item.Id,nowPlayingItem.ThumbImageTag=imageTags.Thumb),imageTags.Logo?(nowPlayingItem.LogoItemId=item.Id,nowPlayingItem.LogoImageTag=imageTags.Logo):item.ParentLogoImageTag&&(nowPlayingItem.LogoItemId=item.ParentLogoItemId,nowPlayingItem.LogoImageTag=item.ParentLogoImageTag),nowPlayingItem},self.beginPlayerUpdates=function(){},self.endPlayerUpdates=function(){},self.onBeforePlaybackStart=function(mediaRenderer,item,mediaSource){var state=self.getPlayerStateInternal(mediaRenderer,item,mediaSource);Events.trigger(self,"beforeplaybackstart",[state])},self.onPlaybackStart=function(mediaRenderer,item,mediaSource){var state=self.getPlayerStateInternal(mediaRenderer,item,mediaSource);Events.trigger(self,"playbackstart",[state]),self.startProgressInterval()},self.onVolumeChanged=function(mediaRenderer){self.saveVolume(mediaRenderer.volume());var state=self.getPlayerStateInternal(mediaRenderer,self.currentItem,self.currentMediaSource);Events.trigger(self,"volumechange",[state])},self.cleanup=function(){},self.onPlaybackStopped=function(){console.log("playback stopped"),document.body.classList.remove("bodyWithPopupOpen");var mediaRenderer=this;unBindAudioEvents(mediaRenderer),Events.off(mediaRenderer,"ended",self.onPlaybackStopped);var item=self.currentItem,mediaSource=self.currentMediaSource,state=self.getPlayerStateInternal(mediaRenderer,item,mediaSource);self.cleanup(mediaRenderer),clearProgressInterval(),"Video"==item.MediaType&&self.resetEnhancements(),Events.trigger(self,"playbackstop",[state])},self.onPlaystateChange=function(mediaRenderer){console.log("mediaplayer onPlaystateChange");var state=self.getPlayerStateInternal(mediaRenderer,self.currentItem,self.currentMediaSource);Events.trigger(self,"playstatechange",[state])},window.addEventListener("beforeunload",onAppClose),self.canAutoPlayAudio=function(){return!!AppInfo.isNativeApp||!browser.mobile};var repeatMode="RepeatNone";self.getRepeatMode=function(){return repeatMode},self.setRepeatMode=function(mode){repeatMode=mode};var getItemFields="MediaSources,Chapters";self.tryPair=function(target){return new Promise(function(resolve,reject){resolve()})}}window.MediaPlayer=new mediaPlayer,window.MediaPlayer.init=function(){window.MediaController.registerPlayer(window.MediaPlayer),window.MediaController.setActivePlayer(window.MediaPlayer,window.MediaPlayer.getTargetsInternal()[0])}});