/*

@license
dhtmlxScheduler v.5.3.14 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) XB Software Ltd.

*/
Scheduler.plugin(function(scheduler){

scheduler.attachEvent("onLightBox",function(){
	if (this._cover){
		try{
			this._cover.style.height = this.expanded ? "100%" : ((document.body.parentNode||document.body).scrollHeight+"px");
		} catch(e) {}
	}
});

scheduler.form_blocks.select.set_value=function(node,value,ev){
	if (typeof value == "undefined" || value === "")
		value = (node.firstChild.options[0]||{}).value;
	node.firstChild.value=value||"";
};

});