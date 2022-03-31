/*
@license
dhtmlxScheduler v.4.4.9 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){e.attachEvent("onTemplatesReady",function(){e.xy.scroll_width=0;var t=e.render_view_data;e.render_view_data=function(){var a=this._els.dhx_cal_data[0];a.firstChild._h_fix=!0,t.apply(e,arguments);var i=parseInt(a.style.height);a.style.height="1px",a.style.height=a.scrollHeight+"px",this._obj.style.height=this._obj.clientHeight+a.scrollHeight-i+"px"};var a=e._reset_month_scale;e._reset_month_scale=function(t,i,n,r){var d={clientHeight:100};a.apply(e,[d,i,n,r]),t.innerHTML=d.innerHTML;
}})});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_monthheight.js.map