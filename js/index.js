document.oncontextmenu=function(){
  return false;
}//禁止右键菜单

var page0=document.getElementById('page0');
var page1=document.getElementById('page1');
var page2=document.getElementById('page2');

page0.style.display="none";
page1.style.display="none";
page2.style.display="none";

var Data = {action:'open'};//记录是否是第一次打开,以及待发送的消息
sendMessage(Data);

var popupState={
  Page1:false,
  Page2:false,
  Data:null,
  Page2DOM:null
};//记录当前状态

function sendMessage(Data){
  chrome.runtime.sendMessage(JSON.stringify(Data),function(response){});
}

chrome.runtime.onMessage.addListener(function(Data,sender,sendResponse){
  popupState.Data=JSON.parse(Data);
  switch(popupState.Data.state){
    case 0:
      page0.style.display="block";
      page1.style.display="none";
      page2.style.display="none";
      var img=page0.getElementsByTagName("img")[0];
      img.src=popupState.Data.ewm;
      break;
    case 1:
      page0.style.display="block";
      page1.style.display="none";
      page2.style.display="none";
      var img=page0.getElementsByTagName("img")[0];
      img.src=popupState.Data.avatar;
      break;
    case 4:
      updatePage1();
      break;
    default:
      if(popupState.Page1===false){
        enterPage1();
        popupState.Page1=true;
      }
      else if(popupState.Page2===false){
        updatePage1();
      }
      else{
        updatePage1();
        updatePage2.apply(popupState.Page2DOM);
      }     
    }
    
  function enterPage1(){
    page0.style.display="none";
    page1.style.display="block";
    page2.style.display="none";
    
    //给联系人列表赋值
    var contactDiv=document.getElementById('contactDiv');
    var lastContactDiv=document.getElementById('lastContactDiv');
    if(!isEmpty(popupState.Data.list)){
      lastContactDiv.appendChild(document.createElement('hr'));
      //最近联系人
      for(var x in popupState.Data.list){
        for(var i=0,l=popupState.Data.contact.length;i<l;i++){
          if(x===popupState.Data.contact[i].UserName){
            addContactItem(lastContactDiv,popupState.Data.contact[i],popupState.Data.list[x].unread);
            break;
          }
        }
      }
      
    }
    //联系人列表
    for(var i=0,l=popupState.Data.contact.length;i<l;i++){
      addContactItem(contactDiv,popupState.Data.contact[i]);
    }
  
    
    //搜索框
    var searchDiv=document.getElementById('searchDiv');
    var searchDiv_input=searchDiv.getElementsByTagName('input')[0];
    var searchDiv_button=searchDiv.getElementsByTagName('button')[0];
    searchDiv_button.style.display='none';
    searchDiv_button.onclick=function(){
      searchDiv_input.value='';
      contactDiv.style.display='block';
      suggestDiv.style.display='none';
      searchDiv_button.style.display='none';
    }
    
    var suggestDiv=document.getElementById('suggestDiv');
    searchDiv.oninput=function(){
      suggestDiv.innerHTML='';
      suggestDiv.appendChild(document.createElement('hr'));
      if(searchDiv_input.value){
        contactDiv.style.display='none';
        suggestDiv.style.display='block';
        searchDiv_button.style.display='block';
        var re=[];//保存搜索结果
        for(var i=0,l=popupState.Data.contact.length;i<l;i++){
          re[i]={
            num:i,
            value:distance(popupState.Data.contact[i].Name,searchDiv_input.value)
          }
        }
        re=re.sort(function(a,b){
          return a.value-b.value;
        });
          
        for(var i=0;i<=(re[0].value?2:0);i++){
          addContactItem(suggestDiv,popupState.Data.contact[re[i].num]);
        }
      }
      else{
        contactDiv.style.display='block';
        suggestDiv.style.display='none';
        searchDiv_button.style.display='none';
      }
    }
  }
  
  function addContactItem(div,contact,unread){
    var img=document.createElement('img');
    img.src=contact.HeadImgUrl;
  
    var data=document.createElement('div');
    data.innerText=contact.Name;
    
    var contactItem=document.createElement('div');
    contactItem.className="contactItem";
    contactItem.appendChild(img);
    contactItem.appendChild(data);
    
    if(unread>0){
      if(contact.UserName===(popupState.Page2DOM?popupState.Page2DOM.username:null)){
        sendMessage({
          action:'clear',
          username:contact.UserName
        });
      }
      else{
        var svg=document.createElement('div');
        svg.className='svg';
        svg.innerHTML='<svg width="20" height="20"><circle cx="10" cy="10" r="10" fill="red"/></svg>';
        contactItem.appendChild(svg);
      }
    }
    
    contactItem.username=contact.UserName;
    contactItem.onclick=enterPage2;

    div.appendChild(contactItem);
  }
    
  function enterPage2(){
    sendMessage({
      action:'clear',
      username:this.username
    });
    popupState.Page2DOM=this;
    popupState.Page2=true;
    
    page0.style.display="none";
    page1.style.display="none";
    page2.style.display="block";
      
    var backDiv=document.getElementById('backDiv');
    var backButton=backDiv.getElementsByTagName('button')[0];
      
    backButton.onclick=function(){
      popupState.Page2=false;
      popupState.Page2DOM=null;
      
      page0.style.display="none";
      page1.style.display="block";
      page2.style.display="none";
    }
    var backLabel=backDiv.getElementsByTagName('label')[0];
    backLabel.innerText=this.getElementsByTagName('div')[0].innerText;
      
    var messageDiv=document.getElementById('messageDiv');
    messageDiv.innerHTML='';
    messageDiv.appendChild(document.createElement('hr'));
      
    if(popupState.Data.list[this.username]){
      for(var i=0,l=popupState.Data.list[this.username].array.length;i<l;i++){
        var img=document.createElement('img');
        img.src=this.getElementsByTagName('img')[0].getAttribute('src');
          
        var content=document.createElement('textarea');
        content.readOnly=true;
        content.value=popupState.Data.list[this.username].array[i].content;
          
        var messageItem=document.createElement('div');
        messageItem.className="messageItem";
        messageItem.appendChild(img);
        messageItem.appendChild(content);
          
        if(popupState.Data.list[this.username].array[i].from===0){
          messageItem.className="messageItem_me";
          img.src=popupState.Data.avatar;
        }
          
        messageDiv.appendChild(messageItem);
      }
    }

    var that=this;
    var sendDiv=document.getElementById('sendDiv');
    sendDiv.getElementsByTagName('textarea')[0].value='';
    sendDiv.getElementsByTagName('textarea')[0].onkeypress=function(e){
      if(e.keyCode!==13)return;
      if(this.value)sendMessage({
        action:'msg',
        msg:{
        username:that.username,
        content:this.value
        }
      });
      this.blur();
      this.value='';
    }  
  }
  
  function updatePage1(){
    var lastContactDiv=document.getElementById('lastContactDiv');
    lastContactDiv.innerHTML='';
    if(!isEmpty(popupState.Data.list)){
      lastContactDiv.appendChild(document.createElement('hr'));
      //最近联系人
      for(var x in popupState.Data.list){
        for(var i=0,l=popupState.Data.contact.length;i<l;i++){
          if(x===popupState.Data.contact[i].UserName){
            addContactItem(lastContactDiv,popupState.Data.contact[i],popupState.Data.list[x].unread);
            break;
          }
        }
      }
      
    }
  }
  
  function updatePage2(){
    var messageDiv=document.getElementById('messageDiv');
    messageDiv.innerHTML='';
    messageDiv.appendChild(document.createElement('hr'));
    if(popupState.Data.list[this.username]){
      for(var i=0,l=popupState.Data.list[this.username].array.length;i<l;i++){
        var img=document.createElement('img');
        img.src=this.getElementsByTagName('img')[0].getAttribute('src');
          
        var content=document.createElement('textarea');
        content.readOnly=true;
        content.value=popupState.Data.list[this.username].array[i].content;
          
        var messageItem=document.createElement('div');
        messageItem.className="messageItem";
        messageItem.appendChild(img);
        messageItem.appendChild(content);
          
        if(popupState.Data.list[this.username].array[i].from===0){
          messageItem.className="messageItem_me";
          img.src=popupState.Data.avatar;
        }
          
        messageDiv.appendChild(messageItem);
        // messageDiv.scrollIntoView(false);
      }
    }
  }
  
});

//修改距离
function distance(a, b) {
	var al = a.length + 1;
	var bl = b.length + 1;
	var result = [];
	var temp = 0;
	for (var i = 0; i < al; result[i] = [i++]) {}
	for (var i = 0; i < bl; result[0][i] = i++) {}		
	for (i = 1; i < al; i++) {
		for (var j = 1; j < bl; j++) {
			temp = a[i - 1] == b[j - 1] ? 0 : 1;
			result[i][j] = Math.min(result[i - 1][j] + 1, result[i][j - 1] + 1, result[i - 1][j - 1] + temp);
		}
	}
	return result[i-1][j-1];
}

//判断对象是否为空
function isEmpty(obj){
  for(var name in obj){
    if(obj.hasOwnProperty(name)){
      return false;
    }
  }
  return true;
};