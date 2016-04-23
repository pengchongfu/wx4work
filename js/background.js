var Data = {};//当前消息,可能为二维码,头像,消息状态

function sendMessage(Data){
  chrome.runtime.sendMessage(JSON.stringify(Data),function(response){
    
  });
}

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  message=JSON.parse(message);
  if(message.open){sendMessage(Data);}
  
});

run();

function run(){
  getUuid().then(checkState).then(login).then(init).then(getContact).then(syncCheck);
}



function getUuid(){
  return new Promise(function(resolve,reject){
    console.log('获取二维码');
    var wxSession={};
    var url = "https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_="+Date.now();
    request("GET",url,function(body) {
      wxSession.uuid=body.substring(50,62);
      wxSession.tip=1;
      Data={ewm:"https://login.weixin.qq.com/qrcode/"+wxSession.uuid};
      console.log("请扫描二维码");
      resolve(wxSession);
    });
  });
}

function request(method,url,callback){
  var xhr = new XMLHttpRequest();
  xhr.open(method,url,true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4){
      callback(xhr.responseText);
    }
  }
  xhr.send();
}

function checkState(wxSession){
  var url='https://login.weixin.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid='+wxSession.uuid+"&tip="+wxSession.tip+"&r="+~Date.now()+"_="+Date.now();
  return new Promise(function(resolve,reject){
    request("GET",url,function(body){
      if(/window\.code=201/.test(body)){
        wxSession.tip=0;
        console.log("请确认登录");
        Data={avatar:body.split("'")[1]};
        sendMessage(Data);
        resolve(checkState(wxSession));
      }
      else if(/window\.code=200/.test(body)){
        wxSession.redirect=/window\.redirect_uri="([^"]+)";/.exec(body)[1];
        Data=wxSession;
        sendMessage(Data);
        console.log("重定向成功");
        var e=/https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?/.exec(wxSession.redirect)[0];
            t="weixin.qq.com",
            o="file.wx.qq.com",
            n="webpush.weixin.qq.com";
        e.indexOf("wx2.qq.com")>-1?(t="weixin.qq.com",o="file2.wx.qq.com",n="webpush2.weixin.qq.com"):e.indexOf("qq.com")>-1?(t="weixin.qq.com",o="file.wx.qq.com",n="webpush.weixin.qq.com"):e.indexOf("web1.wechat.com")>-1?(t="wechat.com",o="file1.wechat.com",n="webpush1.wechat.com"):e.indexOf("web2.wechat.com")>-1?(t="wechat.com",o="file2.wechat.com",n="webpush2.wechat.com"):e.indexOf("wechat.com")>-1?(t="wechat.com",o="file.wechat.com",n="webpush.wechat.com"):e.indexOf("web1.wechatapp.com")>-1?(t="wechatapp.com",o="file1.wechatapp.com",n="webpush1.wechatapp.com"):(t="wechatapp.com",o="file.wechatapp.com",n="webpush.wechatapp.com");
        //以上为web微信源代码内的代码，只使用了e和t，e代表获取消息的服务器，n代表保持轮询的服务器
        wxSession.e=e;
        wxSession.t="https://"+t;
        wxSession.o="https://"+o;
        wxSession.n="https://"+n;
        resolve(wxSession);
      }
      else{
        resolve(checkState(wxSession));
      }
    });
  });
}

function login(wxSession){
  return new Promise(function(resolve,reject){
    request("GET",wxSession.redirect+"&fun=new&version=v2&lang=en_US",
    function(body){
      wxSession.BaseRequest={
        skey:(new RegExp('<skey>([^<]+)</skey>')).exec(body)[1],
        sid:(new RegExp('<wxsid>([^<]+)</wxsid>')).exec(body)[1],
        uin:(new RegExp('<wxuin>([^<]+)</wxuin>')).exec(body)[1],
        deviceId:'e' + ('' + Math.random().toFixed(15)).substring(2, 17)
      };
      wxSession.pass_ticket=(new RegExp('<pass_ticket>([^<]+)</pass_ticket>')).exec(body)[1];
      console.log("登录成功");
      resolve(wxSession);
    });
  });
}

function init(wxSession){
  function request(method,url,body,callback){
    var xhr = new XMLHttpRequest();
    xhr.open(method,url,true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        callback(xhr.responseText);
      }
    }
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(body));
  }
  
  return new Promise(function(resolve,reject){
    var url=wxSession.e+"/cgi-bin/mmwebwx-bin/webwxinit?r="+~Date.now()+"&lang=en_US&pass_ticket="+wxSession.pass_ticket;
    request("POST",url,{BaseRequest:wxSession.BaseRequest},function(body){
      console.log("初始化成功");
      body=JSON.parse(body);
      wxSession.username = body['User']['UserName'];
      wxSession.nickname = body['User']['NickName'];
      wxSession.synckey = body['SyncKey'];
      resolve(wxSession);
    });
  });
}

function getContact(wxSession){
  return new Promise(function(resolve,reject){
    var url=wxSession.e+'/cgi-bin/mmwebwx-bin/webwxgetcontact?lang=en_US&pass_ticket='+wxSession.BaseRequest.pass_ticket+'&skey='+wxSession.BaseRequest.skey+'&seq=0&r='+Date.now();
    request("GET",url,function(body){
      body=JSON.parse(body);
      wxSession.MemberList=body.MemberList.map(function(object){
        var member={};
        member.UserName=object.UserName;
        member.RemarkName=object.RemarkName;
        member.NickName=object.NickName;
        return member;
      });
      console.log("获取联系人列表成功");
      resolve(wxSession);
    });
  });
}



function syncCheck(wxSession){
  return new Promise(function(resolve,reject){
    var synckey=wxSession.synckey.List.map(o=>o.Key + '_' + o.Val).join('|');
    var url=wxSession.n+'/cgi-bin/mmwebwx-bin/synccheck?r='+Date.now()+"&skey="+wxSession.BaseRequest.skey+"&sid="+wxSession.BaseRequest.sid+"&uin="+wxSession.BaseRequest.uin+"&deviceid="+wxSession.BaseRequest.deviceId+"&synckey="+synckey;
    request("GET",url,function(body){
      if(body!=='window.synccheck={retcode:"0",selector:"0"}'){
        resolve(webwxsync(wxSession));
      }
      else{
        resolve(syncCheck(wxSession));
      }
    });
  });
}

function webwxsync(wxSession){
  function request(method,url,body,callback){
    var xhr = new XMLHttpRequest();
    xhr.open(method,url,true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        callback(xhr.responseText);
      }
    }
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(body));
  }
  
  return new Promise(function(resolve,reject){
    var body={
      BaseRequest:wxSession.BaseRequest,
      SyncKey:wxSession.synckey,
    };
    
    var url=wxSession.e+'/cgi-bin/mmwebwx-bin/webwxsync?sid='+wxSession.BaseRequest.sid+'&skey='+wxSession.BaseRequest.skey+'&lang=en_US&pass_ticket=$'+wxSession.pass_ticket+'&rr='+~Date.now();
    request("POST",url,body,function(body){
      console.log(body);
      body=JSON.parse(body);
      if(body.BaseResponse.Ret===1101){
        console.log("微信已退出");
        run();
        return;
      }
      if(!body||body.BaseResponse.Ret!==0){
        resolve(webwxsync(wxSession));
        return;
      }
      wxSession.synckey=body.SyncKey;
      // if(body.AddMsgList.length>0){
      //   for(var i=0,l=body.AddMsgList.length;i<l;i++){
      //     if(body.AddMsgList[i].MsgType===1){
      //       receiveMsg(body.AddMsgList[i].FromUserName,body.AddMsgList[i].Content,wxSession);
      //     }
      //   }
      // }
      resolve(syncCheck(wxSession));
    });
  });
}

/*处理接收到的消息*/
function receiveMsg(username,content,wxSession){
  var user='';
  for(var i in wxSession.MemberList){
    if(wxSession.MemberList[i].UserName===username){
      user=wxSession.MemberList[i].RemarkName?wxSession.MemberList[i].RemarkName:wxSession.MemberList[i].NickName;
      break;
    }
  }
  if(user===''){
    user="微信群";
    return;//屏蔽微信群消息，其实是因为不想再做微信群的消息收发了。。。
  }
  
  readline.clearLine(process.stdout,0);
  readline.cursorTo(process.stdout,0);
  console.log(chalk.green(user+" >> "+content));
  wxSession.rl.prompt(true);
}

//向服务器通知状态
function notify(){
  
}