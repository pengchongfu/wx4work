document.oncontextmenu=function(){
  return false;
}//禁止右键菜单


var div=document.getElementById("div");
var img=document.createElement("img");

var Data = {open:1};//记录是否是第一次打开,以及待发送的消息
sendMessage(Data);

var messageRecieved={list:[]};//记录已保存的消息

function sendMessage(Data){
  chrome.runtime.sendMessage(JSON.stringify(Data),function(response){
    
  });
}

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  chrome.browserAction.setBadgeText({text: ''});//清除
  sendMessage({clear:1});//通知后台已接收消息
  message=JSON.parse(message);
  if(message.list.length>0){
    if(img.parentNode){img.parentNode.removeChild(img);}
    for(var i=messageRecieved.list.length,l=message.list.length;i<l;i++){
            
      var imgdiv_img=document.createElement('img');
      imgdiv_img.src=message.list[i].HeadImgUrl;
      imgdiv_img.className="imgdiv_img";
      var imgdiv=document.createElement('div');
      imgdiv.className="imgdiv";
      imgdiv.appendChild(imgdiv_img);
      
      var userdiv=document.createElement('div');
      userdiv.className="userdiv";
      userdiv.innerText=message.list[i].user;
      
      var contentdiv_input=document.createElement('textarea');
      contentdiv_input.className="contentdiv_input";
      contentdiv_input.value=message.list[i].content;
      var contentdiv=document.createElement('div');
      contentdiv.className="contentdiv";
      contentdiv.appendChild(contentdiv_input);
      
      var mesdiv=document.createElement('div');
      mesdiv.className="mesdiv";
      mesdiv.appendChild(imgdiv);
      mesdiv.appendChild(userdiv);
      mesdiv.appendChild(contentdiv);
      
      //对消息框添加发送消息事件
      if(message.list[i].from==="me"){
        mesdiv.className="mesdiv_me";
        contentdiv_input.setAttribute("readonly","readonly");
      }
      else{
        contentdiv_input.username=message.list[i].username;
        contentdiv_input.originvalue=message.list[i].content;
        contentdiv_input.onkeypress=function(e){
          if(e.keyCode!==13)return;
          if(this.value)sendMessage({msg:{
            username:this.username,
            content:this.value
          }});
          this.value=this.originvalue;
          this.blur();
        }
        
        contentdiv_input.onfocus=function(){
          this.value="";
        }
        
        contentdiv_input.onblur=function(){
          this.value=this.originvalue;
        }
      }
      
      div.appendChild(mesdiv);
      div.scrollIntoView(false);
    }
  }
  else if(message.avatar){
    img.src=message.avatar;
    div.appendChild(img);
  }
  else{
    img.src=message.ewm;
    div.appendChild(img);
  }
  messageRecieved.list=message.list;
});