var Data = {};//当前状态,可能为二维码,头像,消息状态

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

function request(method,url,body,callback){
  var xhr = new XMLHttpRequest();
  xhr.open(method,url,true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4){
      callback(xhr.responseText);
    }
  }
  if(body){
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(body));
  }
  else{
    xhr.send();
  }
}

function getUuid(){
  return new Promise(function(resolve,reject){
    console.log('获取二维码');
    var wxSession={};
    var url = "https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_="+Date.now();
    request("GET",url,null,function(body) {
      wxSession.uuid=body.substring(50,62);
      wxSession.tip=1;
      Data={ewm:"https://login.weixin.qq.com/qrcode/"+wxSession.uuid};
      sendMessage(Data);
      console.log("请扫描二维码");
      resolve(wxSession);
    });
  });
}

function checkState(wxSession){
  var url='https://login.weixin.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid='+wxSession.uuid+"&tip="+wxSession.tip+"&r="+~Date.now()+"_="+Date.now();
  return new Promise(function(resolve,reject){
    request("GET",url,null,function(body){
      if(/window\.code=201/.test(body)){
        wxSession.tip=0;
        console.log("请确认登录");
        Data={avatar:body.split("'")[1]};
        sendMessage(Data);
        resolve(checkState(wxSession));
      }
      else if(/window\.code=200/.test(body)){
        wxSession.redirect=/window\.redirect_uri="([^"]+)";/.exec(body)[1];
        console.log("获取重定向链接");
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
      else if(/window\.code=400/.test(body)){
        resolve(getUuid().then(checkState));
      }
      else{
        resolve(checkState(wxSession));
      }
    });
  });
}

function login(wxSession){
  return new Promise(function(resolve,reject){
    request("GET",wxSession.redirect+"&fun=new&version=v2&lang=en_US",null,
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
    request("GET",url,null,function(body){
      body=JSON.parse(body);
      wxSession.MemberList=body.MemberList.map(function(object){
        var member={};
        member.UserName=object.UserName;
        member.RemarkName=object.RemarkName;
        member.NickName=object.NickName;
        return member;
      });
      console.log("获取联系人列表成功");
      notify(wxSession);//向服务器发送已登陆状态
      resolve(wxSession);
    });
  });
}

//向服务器通知状态
function notify(wxSession){
  var url="https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxstatusnotify?pass_ticket="+wxSession.pass_ticket;
  var body={
    BaseRequest:wxSession.BaseRequest,
    Code:3,
    FromUserName:wxSession.username,
    ToUserName:wxSession.username,
    ClientMsgId:Date.now()
  };
  request("POST",url,body,function(body){
    
  });
}

function syncCheck(wxSession){
  return new Promise(function(resolve,reject){
    var synckey=wxSession.synckey.List.map(o=>o.Key + '_' + o.Val).join('|');
    var url=wxSession.n+'/cgi-bin/mmwebwx-bin/synccheck?r='+Date.now()+"&skey="+wxSession.BaseRequest.skey+"&sid="+wxSession.BaseRequest.sid+"&uin="+wxSession.BaseRequest.uin+"&deviceid="+wxSession.BaseRequest.deviceId+"&synckey="+synckey;
    request("GET",url,null,function(body){
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
  return new Promise(function(resolve,reject){
    var body={
      BaseRequest:wxSession.BaseRequest,
      SyncKey:wxSession.synckey,
    };
    var url=wxSession.e+'/cgi-bin/mmwebwx-bin/webwxsync?sid='+wxSession.BaseRequest.sid+'&skey='+wxSession.BaseRequest.skey+'&lang=en_US&pass_ticket=$'+wxSession.pass_ticket+'&rr='+~Date.now();
    request("POST",url,body,function(body){
      body=JSON.parse(body);
      if(body.BaseResponse.Ret===1101){
        console.log("微信已退出");
        run();
        return;
      }
      if(!body||body.BaseResponse.Ret!==0){
        resolve(webwxsync(wxSession));
      }
      wxSession.synckey=body.SyncKey;
      
      chrome.browserAction.setBadgeText({text: '100'});//新消息数目
      if(body.AddMsgList.length>0){
        for(var i=0,l=body.AddMsgList.length;i<l;i++){
          if(body.AddMsgList[i].MsgType===1){
            receiveMsg(body.AddMsgList[i].FromUserName,body.AddMsgList[i].Content,wxSession);
          }
        }
      }
      resolve(syncCheck(wxSession));
    });
  });
}

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

  console.log(user+" >> "+content);
}

// /*进入cli模式*/
// function cli(wxSession){
//   wxSession.userTalkking={
//     user:'',
//     username:''
//   };
//   console.log(chalk.red("用户不存在，请通过`!username`设置"));
//   const rl=readline.createInterface({
//     input:process.stdin,
//     output:process.stdout,
//     terminal:true,
//   });
//   rl.setPrompt(wxSession.userTalkking.user+" << ");
//   rl.on('line',function(input){
//     if(input==="!clear"){
//       process.stdout.write('\u001B[2J\u001B[0;0f'),
//       rl.prompt();
//       return;
//     }
//     if(input==="!exit"){
//       process.exit(0);
//     }
//     if(input===""){
//       rl.prompt();
//       return;
//     }
//     if(input==="!user"){
//       if(!wxSession.userTalkking.user||!wxSession.userTalkking.username){
//         console.log(chalk.red("用户不存在，请通过`!username`设置"));
//       }
//       else{
//         console.log(chalk.blue("当前用户为 "+wxSession.userTalkking.user));
//       }
//       rl.prompt();
//       return;
//     }
//     if(input[0]==="!"){
//       var user=input.substr(1);
//       var username='';
//       for(var i=0,l=wxSession.MemberList.length;i<l;i++){
//         if(wxSession.MemberList[i].RemarkName===user){
//           username=wxSession.MemberList[i].UserName;
//           break;
//         }
//       }
//       if(!username){
//         for(var i=0,l=wxSession.MemberList.length;i<l;i++){
//           if(wxSession.MemberList[i].NickName===user){
//             username=wxSession.MemberList[i].UserName;
//             break;
//           }
//         }
//       }
      
//       if(user===''||username===''){
//         console.log(chalk.red("用户不存在，请通过`!username`设置"));
//         rl.prompt();
//         return;
//       }
//       wxSession.userTalkking.user=user;
//       wxSession.userTalkking.username=username;
//       console.log(chalk.blue("当前用户更换为 "+wxSession.userTalkking.user));
//       rl.setPrompt(wxSession.userTalkking.user+" << ");
//       rl.prompt();
//     }
//     else {
//       if(wxSession.userTalkking.user||wxSession.userTalkking.username){
//         sendMsg(input,wxSession);
//       }
//       else{
//         console.log(chalk.red("用户不存在，请通过`!username`设置"));
//       }
//       rl.prompt();
//     }
//   });
//   rl.prompt();
//   wxSession.rl=rl;
// }

// /*发送消息到服务器*/
// function sendMsg(msg,wxSession){
//   var user=wxSession.userTalkking.user;
//   var username=wxSession.userTalkking.username; 
//   var msgId=(Date.now()+Math.random().toFixed(3)).replace('.','');
//   var body={
//     BaseRequest:wxSession.BaseRequest,
//     Msg:{
//       Type:1,
//       Content:msg,
//       FromUserName:wxSession.username,
//       ToUserName:username,
//       LocalId:msgId,
//       ClientMsgId:msgId
//     }
//   }
//   var options={
//     baseUrl:wxSession.e,
//     uri:"/cgi-bin/mmwebwx-bin/webwxsendmsg?lang=en_US&pass_ticket="+wxSession.pass_ticket,
//     method:"POST",
//     jar:true,
//     json:true,
//     body:body
//   }
//   request(options,function(err,res,body){
//     if(err||body.BaseResponse.Ret!==0){
//       readline.clearLine(process.stdout,0);
//       readline.cursorTo(process.stdout,0);
//       console.log(chalk.red(user+" << "+msg));
//       wxSession.rl.prompt(true);
//     }
//   });
// }