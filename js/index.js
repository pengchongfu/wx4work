var div=document.getElementById("div");
var img=document.createElement("img");
var Data = {open:'open'};
sendMessage(Data);

function sendMessage(Data){
  chrome.runtime.sendMessage(JSON.stringify(Data),function(response){
    
  });
}


chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  console.log(message);

  message=JSON.parse(message);
  if(message.ewm){
    img.src=message.ewm;
    div.appendChild(img);
  }
  else if(message.avatar){
    img.src=message.avatar;
  }
  else{
    div.removeChild(img);
    div.innerText=JSON.stringify(message);
  }
  
});