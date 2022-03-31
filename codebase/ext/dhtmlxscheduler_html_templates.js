/*
@license
dhtmlxScheduler v.4.4.9 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){e.attachEvent("onTemplatesReady",function(){for(var t=document.body.getElementsByTagName("DIV"),i=0;i<t.length;i++){var a=t[i].className||"";if(a=a.split(":"),2==a.length&&"template"==a[0]){var n='return "'+(t[i].innerHTML||"").replace(/\"/g,'\\"').replace(/[\n\r]+/g,"")+'";';n=unescape(n).replace(/\{event\.([a-z]+)\}/g,function(e,t){return'"+ev.'+t+'+"'}),e.templates[a[1]]=Function("start","end","ev",n),t[i].style.display="none"}}})});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_html_templates.js.map