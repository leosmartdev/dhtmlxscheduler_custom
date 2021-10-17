/*

@license
dhtmlxScheduler v.5.3.12 Professional Evaluation

This software is covered by DHTMLX Evaluation License. Contact sales@dhtmlx.com to get Commercial or Enterprise license. Usage without proper license is prohibited.

(c) XB Software Ltd.

*/
Scheduler.plugin(function(e){!function(){function t(e,t,i){var n=e+"="+i+(t?"; "+t:"");document.cookie=n}function i(e){var t=e+"=";if(document.cookie.length>0){var i=document.cookie.indexOf(t);if(-1!=i){i+=t.length;var n=document.cookie.indexOf(";",i);return-1==n&&(n=document.cookie.length),document.cookie.substring(i,n)}}return""}function n(e){return(e._obj.id||"scheduler")+"_settings"}var a=!0;e.attachEvent("onBeforeViewChange",function(t,r,o,s){if(a&&e._get_url_nav){var d=e._get_url_nav()
;(d.date||d.mode||d.event)&&(a=!1)}var _=n(e);if(a){a=!1;var l=i(_);if(l){e._min_date||(e._min_date=s),l=unescape(l).split("@"),l[0]=this._helpers.parseDate(l[0]);var h=this.isViewExists(l[1])?l[1]:o,s=isNaN(+l[0])?s:l[0];return window.setTimeout(function(){e.setCurrentView(s,h)},1),!1}}return!0}),e.attachEvent("onViewChange",function(i,a){t(n(e),"expires=Sun, 31 Jan 9999 22:00:00 GMT",escape(this._helpers.formatDate(a)+"@"+i))});var r=e._load;e._load=function(){var t=arguments
;if(e._date)r.apply(this,t);else{var i=this;window.setTimeout(function(){r.apply(i,t)},1)}}}()});