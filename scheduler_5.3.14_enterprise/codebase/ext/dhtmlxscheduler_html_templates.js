/*

@license
dhtmlxScheduler v.5.3.14 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){e.attachEvent("onTemplatesReady",function(){for(var t=document.body.getElementsByTagName("DIV"),a=0;a<t.length;a++){var i=t[a].className||"";if(i=i.split(":"),2==i.length&&"template"==i[0]){var n='return "'+(t[a].innerHTML||"").replace(/\"/g,'\\"').replace(/[\n\r]+/g,"")+'";';n=unescape(n).replace(/\{event\.([a-z]+)\}/g,function(e,t){return'"+ev.'+t+'+"'}),e.templates[i[1]]=Function("start","end","ev",n),t[a].style.display="none"}}})});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_html_templates.js.map