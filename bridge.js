//Released to the public domain.

var port=phantom.args[0];
var webpage=require('webpage');
var controlpage=webpage.create();


function respond(response){
//	console.log('responding:'+response);
	controlpage.evaluate('function(){socket.emit("res",'+JSON.stringify(response)+');}');
}

var pages={};
var pageId=1;

function setupPushNotifications(id, page) {
	var callbacks = [
    'onAlert','onConfirm','onConsoleMessage','onError','onInitialized','onLoadFinished',
    'onLoadStarted','onPrompt','onResourceRequested','onResourceReceived','onUrlChanged',
    'onCallback'
  ];
	callbacks.forEach(function(cb) {
		page[cb] = function() { push([id, cb, Array.prototype.slice.call(arguments)]); }
	});
	function push(notification) {
		controlpage.evaluate('function(){socket.emit("push",'+JSON.stringify(notification)+');}');
	}
}

controlpage.onAlert=function(msg){
	var request=JSON.parse(msg);
	var cmdId=request[1];
    var cmd = request[2];
    var arg1 = request[3] || null;
    var arg2 = request[4] || null;
    var arg3 = request[5] || null;
    var arg4 = request[6] || null;
	//console.log(request);
	if(request[0]===0){
		switch(cmd){
		case 'createPage':
			var id=pageId++;
			var page=webpage.create();
			pages[id]=page;
			setupPushNotifications(id, page);
			respond([id,cmdId,'pageCreated']);
			break;
		case 'injectJs':
			var success=phantom.injectJs(arg1);
			respond([0,cmdId,'jsInjected',success]);
			break;
		case 'clearCookies':
			phantom.clearCookies();
			respond([0,cmdId,'clearedCookies',true]);
			break;
		case 'enableCookies':
			phantom.cookiesEnabled = arg1;
			respond([0,cmdId,'enabledCookies',arg1]);
			break;
		case 'exit':
			respond([0,cmdId,'phantomExited']);	//optimistically to get the response back before the line is cut
            phantom.exit(); // Really exit since exitAck never seems to get here. TODO: This breaks running the tests.
			break;
		case 'exitAck':
			phantom.exit();
			break;
		default:
			console.error('unrecognized request:'+request);
			break;
		}
	}
	else{
		var id=request[0];
		var page=pages[id];
		switch(cmd){
		case 'pageOpen':
			page.open(arg1);
			break;
		case 'pageOpenWithCallback':
			page.open(arg1, function(status){
				respond([id, cmdId, 'pageOpened', status]);
			});
			break;
		case 'pageRelease':
			page.release();
			respond([id,cmdId,'pageReleased']);
			break;
		case 'pageInjectJs':
			var result=page.injectJs(arg1);
			respond([id,cmdId,'pageJsInjected',JSON.stringify(result)]);
			break;
		case 'pageIncludeJs':
			page.includeJs(arg1);
			respond([id,cmdId,'pageJsIncluded']);
			break;
		case 'pageSendEvent':
            //console.log("got pageSendEvent", arg1, arg2, arg3, arg4);
			page.sendEvent(arg1, arg2, arg3, arg4);
			respond([id,cmdId,'pageEventSent']);
			break;
		case 'pageUploadFile':
			page.uploadFile(arg1,arg2);
			respond([id,cmdId,'pageFileUploaded']);
			break;
		case 'pageEvaluate':
			var result=page.evaluate.apply(page,request.slice(3));
			respond([id,cmdId,'pageEvaluated',JSON.stringify(result)]);
			break;
		case 'pageRender':
			page.render(arg1);
			respond([id,cmdId,'pageRendered']);
			break;
		case 'pageRenderBase64':
			var result=page.renderBase64(arg1);
			respond([id,cmdId,'pageRenderBase64Done', result]);
			break;
		case 'pageSet':
			page[arg1]=arg2;
			respond([id,cmdId,'pageSetDone']);
			break;
		case 'pageGet':
			var result=page[arg1];
			respond([id,cmdId,'pageGetDone',JSON.stringify(result)]);
			break;
		case 'pageSetFn':
			page[arg1] = eval('(' + arg2 + ')');
			break;
		default:
			console.error('unrecognized request:'+request);
			break;
		}
	}
	//console.log('command:'+parts[1]);
	return;
};

controlpage.onConsoleMessage=function(msg){
	return console.log('console msg:'+msg);
};

controlpage.open('http://127.0.0.1:'+port+'/',function(status){
	//console.log(status);
});
