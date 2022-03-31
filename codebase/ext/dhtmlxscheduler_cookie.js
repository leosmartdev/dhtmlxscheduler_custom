/*
@license
dhtmlxScheduler v.4.4.9 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){!function(){function t(e,t,i){var a=e+"="+i+(t?"; "+t:"");document.cookie=a}function i(e){var t=e+"=";if(document.cookie.length>0){var i=document.cookie.indexOf(t);if(-1!=i){i+=t.length;var a=document.cookie.indexOf(";",i);return-1==a&&(a=document.cookie.length),document.cookie.substring(i,a)}}return""}var a=!0;e.attachEvent("onBeforeViewChange",function(n,r,s,d){if(a&&e._get_url_nav){var l=e._get_url_nav();(l.date||l.mode||l.event)&&(a=!1)}var o=(e._obj.id||"scheduler")+"_settings";
if(a){a=!1;var _=i(o);if(_){e._min_date||(e._min_date=d),_=unescape(_).split("@"),_[0]=this.templates.xml_date(_[0]);var h=this.isViewExists(_[1])?_[1]:s,c=isNaN(+_[0])?d:_[0];return window.setTimeout(function(){e.setCurrentView(c,h)},1),!1}}var u=escape(this.templates.xml_format(d||r)+"@"+(s||n));return t(o,"expires=Sun, 31 Jan 9999 22:00:00 GMT",u),!0});var n=e._load;e._load=function(){var t=arguments;if(e._date)n.apply(this,t);else{var i=this;window.setTimeout(function(){n.apply(i,t)},1)}}}()});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_cookie.js.map