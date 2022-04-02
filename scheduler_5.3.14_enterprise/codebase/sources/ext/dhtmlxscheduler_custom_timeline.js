/*

@license
dhtmlxScheduler v.5.3.14 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) XB Software Ltd.

*/
Scheduler.plugin(function(scheduler){

scheduler._temp_matrix_scope = function(){
var scrollHelperFactory = (function(){
	return function create(){
		var modes = {
			"minMax":"[0;max]",
			"maxMin":"[max;0]",
			"nMaxMin":"[-max;0]"
		};
		
		function createTestElement(){
			var container = document.createElement("div");
			container.style.cssText = 	"direction: rtl;" + 
										"overflow: auto;" +
										"width:100px;" +
										"height: 100px;" +
										"position:absolute;" +
										"top: -100500px;" +
										"left: -100500px;";
			var content = document.createElement("div");
			content.style.cssText = "width: 100500px;height: 1px;";
			container.appendChild(content);
			return container;
		}

		function detectScrollMode(){
			var result = modes.minMax;
			var demoElement = createTestElement();
			document.body.appendChild(demoElement);

			var initialScroll = demoElement.scrollLeft;
			if(initialScroll > 0){
				// scrollLeft goes from zero (left) to maximum value (right), the same way as in ltr mode
				// probably chrome
				result = modes.minMax;
			}else{
				demoElement.scrollLeft = -50;
				if(demoElement.scrollLeft === -50){
					// scrollLeft goes from negative max (left) to zero (right)
					// probably FF
					result = modes.nMaxMin; 
				}else{
					// scrollLeft goes from max (left) to zero (right)
					// probably IE
					result = modes.maxMin; 
				}
			}

			document.body.removeChild(demoElement);
			return result;
		}

		function normalizeValue(value, scrollWidth){
			var mode = getMode();
			if(mode === modes.nMaxMin){
				if(value){
					return -value;
				}else {
					return 0;
				}
			}else if (mode === modes.minMax){
				return scrollWidth - value;
			}else {
				return value;
			}
		}


		function getScrollValue(element){
			var direction = getComputedStyle(element).direction;
			if(!direction || direction === "ltr"){
				return element.scrollLeft;
			}else {
				var maxScroll = element.scrollWidth - element.offsetWidth;
				return normalizeValue(element.scrollLeft, maxScroll);
			}
		}

		function setScrollValue(element, value){
			var direction = getComputedStyle(element).direction;
			if(!direction || direction === "ltr"){
				element.scrollLeft = value;
			}else {
				var maxScroll = element.scrollWidth - element.offsetWidth;
				var normalized = normalizeValue(value, maxScroll);
				element.scrollLeft = normalized;
			}
		}

		var currentMode;
		function getMode(){
			if(!currentMode){
				currentMode = detectScrollMode();
			}
			return currentMode;
		}
		return {
			modes: modes,
			getMode: getMode,
			normalizeValue: normalizeValue,
			getScrollValue: getScrollValue,
			setScrollValue: setScrollValue
		};
	};
})();

scheduler.matrix = {};
scheduler._merge=function(a,b){
	for (var c in b)
		if (typeof a[c] == "undefined")
			a[c]=b[c];
};
scheduler.createTimelineView=function(obj){
	scheduler._skin_init();
	scheduler._merge(obj,{
		// scrollable: true,
		/*globals scrollHelperFactory*/
		scrollHelper: scrollHelperFactory(),
		column_width: 100,
		autoscroll: {
			range_x: 200,// px to edge
			range_y: 100,
			speed_x: 20,// speed
			speed_y: 10
		},

		_is_new_view: true,
		_section_autowidth: true,
		_x_scroll: 0,
		_y_scroll: 0,
		_h_cols: {}, // [cellId: {div: htmlElem, left: number}, ... {}]
		_label_rows: [], // [{div: 'html', top: number}, {}, ...]

		section_autoheight: true,
		name:"matrix",
		x:"time",
		y:"time",
		x_step:1,
		x_unit:"hour",
		y_unit:"day",
		y_step:1,
		x_start:0,
		x_size:24,
		y_start:0,
		y_size:	7,
		render:"cell",
		dx:200,
		dy:50,
		event_dy: scheduler.xy.bar_height-5,
		event_min_dy: scheduler.xy.bar_height-5,
		resize_events: true,
		fit_events: true,
		show_unassigned: false,
		second_scale: false,
		round_position: false,
		_logic: function(render_name, y_unit, timeline) {
			var res = {};
			if(scheduler.checkEvent("onBeforeSectionRender")) {
				res = scheduler.callEvent("onBeforeSectionRender", [render_name, y_unit, timeline]);
			}
			return res;
		}
	});
	obj._original_x_start = obj.x_start;

	//first and last hours are applied only to day based timeline
	if (obj.x_unit != "day") obj.first_hour = obj.last_hour = 0;
	//correction for first and last hour
	obj._start_correction = obj.first_hour?obj.first_hour*60*60*1000:0;
	obj._end_correction = obj.last_hour?(24-obj.last_hour)*60*60*1000:0;

	if (scheduler.checkEvent("onTimelineCreated")) {
		scheduler.callEvent("onTimelineCreated", [obj]);
	}

	dhtmlxEventable(obj);

	var old = scheduler.render_data;
	scheduler.render_data = function(evs, mode) {
		if (this._mode == obj.name) {
			//repaint single event, precision is not necessary
			if (mode && !obj.show_unassigned && obj.render != "cell") {
				for (var i = 0; i < evs.length; i++) {
					this.clear_event(evs[i]);
					this.render_timeline_event.call(this.matrix[this._mode], evs[i], true);
				}
			} else {
				scheduler._renderMatrix.call(obj, true, true);
			}
		} else
			return old.apply(this, arguments);
	};

	scheduler.matrix[obj.name]=obj;
	scheduler.templates[obj.name+"_cell_value"] = function(ar){ return ar?ar.length:""; };
	scheduler.templates[obj.name+"_cell_class"] = function(arr){ return ""; };
	scheduler.templates[obj.name+"_scalex_class"] = function(date){ return ""; };
	scheduler.templates[obj.name+"_second_scalex_class"] = function(date){ return ""; };
	scheduler.templates[obj.name+"_row_class"] = function(section, timeline){
		if(timeline.folder_events_available && section.children){
			// 'folder' class was added to parent nodes of tree timelines in v5.0
			// pre 5.0 timelines didn't use this class if `folder_events_available` was enabled.
			// Move the classname into template in order not to change the behavior again and give the ability to remove this class by redefining the template
			return "folder";
		}
		return "";
	};

	scheduler.templates[obj.name+"_scaley_class"] = function(section_id, section_label, section_options){ return ""; };
	scheduler.templates[obj.name+"_scale_label"] = function(section_id, section_label, section_options){ return section_label; };

	scheduler.templates[obj.name+"_tooltip"] = function(a,b,e){ return e.text; };
	scheduler.templates[obj.name+"_date"] = function(datea, dateb){
		if ( (datea.getDay()==dateb.getDay() && dateb-datea < (24*60*60*1000)) ||
			+datea == +scheduler.date.date_part(new Date(dateb)) ||
			(+scheduler.date.add(datea, 1, "day") == +dateb && dateb.getHours() === 0 && dateb.getMinutes() === 0) )
			return scheduler.templates.day_date(datea);
		if ( (datea.getDay() != dateb.getDay() && dateb-datea < (24*60*60*1000)) ) {
			return scheduler.templates.day_date(datea)+" &ndash; "+scheduler.templates.day_date(dateb);
		}
		return scheduler.templates.week_date(datea, dateb);
	};

	scheduler.templates[obj.name+"_scale_date"] = scheduler.date.date_to_str(obj.x_date||scheduler.config.hour_date);
	scheduler.templates[obj.name+"_second_scale_date"] = scheduler.date.date_to_str((obj.second_scale && obj.second_scale.x_date)?obj.second_scale.x_date:scheduler.config.hour_date);

	scheduler.date["add_" + obj.name + "_private"]= function(date, step){
		var shift = step;
		var unit = obj.x_unit;

		if(obj.x_unit == "minute" || obj.x_unit == "hour"){

			var scroll_step = shift;
			if(obj.x_unit == "hour")
				scroll_step *= 60;
			// if scroll days
			if(!(scroll_step % (24 * 60))){
				// use timezone-safer day operations instead of hour and minutes which are affected by daylight saving time shifts
				shift = scroll_step / (24 * 60);
				unit = 'day';
			}
		}

		return scheduler.date.add(date, shift, unit);
	};

	scheduler.date["add_" + obj.name] = function(date, step, c) {
		var resulting_date = scheduler.date["add_" + obj.name + "_private"](date, (obj.x_length || obj.x_size) * obj.x_step * step);

		if (obj.x_unit == "minute" || obj.x_unit == "hour") {
			var size = (obj.x_length || obj.x_size);
			var converted_step = (obj.x_unit == "hour") ? obj.x_step*60 : obj.x_step;
			if((converted_step * size) % (24 * 60)){
				//if scroll hours within the day
				if ( +scheduler.date.date_part(new Date(date)) == +scheduler.date.date_part(new Date(resulting_date )) ) {
					obj.x_start += step*size;
				} else {
					// total steps starting from 0
					var total_steps = ( (24 * 60) / (size * converted_step) ) - 1;
					var steps_offset = Math.round(total_steps * size);

					if (step > 0) {
						obj.x_start = obj.x_start - steps_offset;
					} else {
						obj.x_start = steps_offset + obj.x_start;
					}
				}
			}
		}
		return resulting_date;
	};
	scheduler.date[obj.name+"_start"] = function(date) {
		var func = scheduler.date[obj.x_unit+"_start"] || scheduler.date.day_start;
		var start_date = func.call(scheduler.date, date);
		var start_offset = start_date.getTimezoneOffset();
		start_date = scheduler.date.add(start_date, obj.x_step*obj.x_start, obj.x_unit);
		var new_offset = start_date.getTimezoneOffset();
		if(start_offset != new_offset) {
			start_date.setTime(start_date.getTime() + (new_offset - start_offset) * 60000);
		}

		return start_date;
	};

	obj._smartRenderingEnabled = function(){
		var viewPort = null;
		if(this.scrollable || this.smart_rendering){
			viewPort = scheduler._timeline_smart_render.getViewPort(this.scrollHelper, this._sch_height);
		}
	
		var scrollableDataContainer = !!viewPort;
	
		var smartRender;
		if(!this.scrollable){
			// smart rendering is disabled by default in non-scrollable timelines
			smartRender = !!this.smart_rendering && scrollableDataContainer;
		}else{
			// and enabled by default in scrollable timelines
			if(this.smart_rendering === false){
				smartRender = false;
			}else{
				smartRender = !!scrollableDataContainer;
			}
		}

		return !!smartRender;
	};

	obj.scrollTo = scheduler.bind(function(scrollPosition){
		if(!scrollPosition){
			return;
		}

		var scrollDate;
		if(scrollPosition.date){
			scrollDate = scrollPosition.date;
		}else if(scrollPosition.left){
			scrollDate = scrollPosition.left;
		}else{
			scrollDate = scrollPosition;
		}

		var scrollTop = -1;
		if(scrollPosition.section){
			scrollTop = this.posFromSection(scrollPosition.section);
		}else if(scrollPosition.top){
			scrollTop = scrollPosition.top;
		}

		var posLeft;
		if(typeof scrollDate == "number"){
			posLeft = scrollDate;
		}else{
			posLeft = this.posFromDate(scrollDate);
		}
		if (scheduler.config.rtl){
			var labelWrapperHeight = +scheduler.$container.querySelector(".dhx_timeline_label_wrapper").style.height.replace("px", "");
			var scalesHeight = this._section_height[this.y_unit.length] + this._label_rows[this._label_rows.length - 1].top;

			if (this.scrollHelper.getMode() == this.scrollHelper.modes.minMax && (scalesHeight > labelWrapperHeight || this.render == "tree")) {
				posLeft -= getScrollbarwidth();
			}
		}

		var dataWrapperDiv = scheduler.$container.querySelector('.dhx_timeline_data_wrapper');
		if (!this.scrollable){
			dataWrapperDiv = scheduler.$container.querySelector(".dhx_cal_data");
		}

		if(this.scrollable){
			this.scrollHelper.setScrollValue(dataWrapperDiv, posLeft);
		}

		if(scrollTop > 0){
			dataWrapperDiv.scrollTop = scrollTop;
		}
	}, obj);

	obj.getScrollPosition = scheduler.bind(function () {
		return {
			left: this._x_scroll || 0,
			top: this._y_scroll || 0
		};
	}, obj);

	obj.posFromDate = scheduler.bind(function(date){
		return scheduler._timeline_getX({start_date: date}, false, this) - 1;//getX adds 1px for event positioning
	}, obj);
	
	obj.dateFromPos = function (x) {
		return scheduler._timeline_drag_date(obj, x);
	};

	obj.sectionFromPos = function(top) {
		var pos = {y: top};
		scheduler._resolve_timeline_section(obj, pos);
		return pos.section;
	};

	obj.resolvePosition = function(pos){
		var result = {
			date: null,
			section: null
		};
		if(pos.left) {
			result.date = obj.dateFromPos(pos.left);
		}
		if(pos.top) {
			result.section = obj.sectionFromPos(pos.top);
		}
		return result;
	};

	obj.posFromSection = scheduler.bind(function(sectionId){
		var order = this.order[sectionId];
		if(order === undefined){
			return -1;
		}

		var top = 0;
		for(var i in this.order){
			if(this.order[i] < order){
				top += this._section_height[i];
			}
		}
		return top;
	}, obj);

	obj.selectEvents = scheduler.bind(function (config) {
		var sectionId = config.section,
			date = config.date,
			selectSubsections = config.selectNested;

		if (date) {
			return selectByDate(sectionId, date, selectSubsections, this);
		} else if(sectionId) {
			return selectBySection(sectionId, selectSubsections, this);
		}
	}, obj);

	function selectBySection(sectionId, selectSubsections, timeline) {
		var evs = scheduler._timeline_smart_render.getPreparedEvents(timeline);
		var sectionIndex = timeline.order[sectionId];
		var section = timeline.y_unit[sectionIndex];
		if (!section) {
			return [];
		}
		var subsections = [sectionId];

		if (selectSubsections) {
			getChildrenIds(section, subsections);
		}

		var sectionEvents = [];
		for (var i = 0; i < subsections.length; i++){
			var sectionIndex = timeline.order[subsections[i]];
			if (sectionIndex !== undefined && evs[sectionIndex]) {
				sectionEvents = sectionEvents.concat(evs[sectionIndex]);
			} else if (evs.undefined) {
				for (var j = 0; j < evs.undefined.length; j++){
					var event = evs.undefined[j];
					if (event[timeline.y_property] == subsections[i]) {
						sectionEvents.push(event);
					}
				}
			}

		}
		return sectionEvents;
	}

	function selectByDate(sectionId, date, selectSubsections, timeline) {
		var evs = scheduler._timeline_smart_render.getPreparedEvents(timeline);

		var columnEvents = [];
		var nestedEvents = [];

		var sectionIndex = timeline.order[sectionId];
		var section = timeline.y_unit[sectionIndex];
		if (!section) {
			return [];
		}
		var cellIndex = scheduler._get_date_index(timeline, date);
		if(evs.$matrix){
			columnEvents = evs.$matrix[sectionIndex][cellIndex]|| [];
			if(selectSubsections && evs.$matrix.$tree && evs.$matrix.$tree[section.key]){
				nestedEvents = evs.$matrix.$tree[section.key][cellIndex] || [];
			}
			return columnEvents.concat(nestedEvents);
		}else{
			return evs[sectionIndex] || [];
		}
	}


	function calculateUnits(from, to, timeline){
		var scaleStartDate = scheduler.date[timeline.name + '_start'](new Date(from));

		// count the required value of timeline.x_size to display the required range.
		var units = 0;
		var currentDate = scaleStartDate;
		var x_step = timeline.x_step;
		var x_unit = timeline.x_unit;
		while(currentDate < to){
			units++;
			currentDate = scheduler.date.add(currentDate, x_step, x_unit);
		}
		// and modify timeline settings  with the calculated number of steps
		return units;
	}

	obj.setRange = scheduler.bind(function(from, to){
		// calculating the start of the timeline - `startDate`, provided with arguments is to be rounded via date start function:
		var scaleStartDate = scheduler.date[this.name + '_start'](new Date(from));
		// count the required value of timeline.x_size to display the required range.
		var units = calculateUnits(from, to, this);

		// and modify timeline settings  with the calculated number of steps
		this.x_size = units;

		// when settings are updated - tell scheduler to display a requested start date,
		// the time scale should contain range from startDate to endDate
		scheduler.setCurrentView(scaleStartDate, this.name);
	}, obj);

	scheduler.callEvent("onOptionsLoad",[obj]);

	//init custom wrappers
	scheduler[obj.name+"_view"]=function(enable){
		if(enable){
			scheduler._set_timeline_dates(obj);
			//_renderMatrix will be called by render_data immediately after
		}else{
			scheduler._renderMatrix.apply(obj, arguments);
		}
	};

	//enable drag for non-cell modes
	var temp_date = new Date();
	var step_diff = (scheduler.date.add(temp_date, obj.x_step, obj.x_unit).valueOf() - temp_date.valueOf()); // "minute" + step in ms
	scheduler["mouse_"+obj.name]=function(pos){ //mouse_coord handler
		//get event object
		var ev = this._drag_event;
		if (this._drag_id){
			ev = this.getEvent(this._drag_id);
		}
		if (obj.scrollable  && !pos.converted) {
			pos.converted = 1;
			pos.x += -obj.dx + obj._x_scroll;
			if (scheduler.config.rtl) {
				var labelWrapperHeight = +scheduler.$container.querySelector(".dhx_timeline_label_wrapper").style.height.replace("px", "");
				var scalesHeight = obj._section_height[obj.y_unit.length] + obj._label_rows[obj._label_rows.length - 1].top;
				pos.x += scheduler.xy.scale_width;
				if (obj.scrollHelper.getMode() == obj.scrollHelper.modes.minMax && (scalesHeight > labelWrapperHeight || obj.render == "tree")) pos.x += getScrollbarwidth();
			}
			pos.y += obj._y_scroll;
		} else if (!scheduler.config.rtl){
			pos.x -= obj.dx;
		} else {
			pos.x -= (obj.dx-scheduler.xy.scale_width);
		}
		var end_date = scheduler._timeline_drag_date(obj, pos.x);

		pos.x =  0;
		pos.force_redraw = true;
		pos.custom = true;

		// as we can simply be calling _locate_cell_timeline
		if (this._drag_mode == "move" && this._drag_id && this._drag_event) {
			var ev = this.getEvent(this._drag_id);
			var drag_event = this._drag_event;

			pos._ignores = (this._ignores_detected || obj._start_correction || obj._end_correction);
			if (drag_event._move_delta === undefined) {
				drag_event._move_delta = (ev.start_date-end_date)/60000;
				if (this.config.preserve_length && pos._ignores){
					drag_event._move_delta = this._get_real_event_length(ev.start_date,end_date, obj);
					drag_event._event_length = this._get_real_event_length(ev.start_date,ev.end_date, obj);
				}
			}


			//preserve visible size of event
			if (this.config.preserve_length && pos._ignores){
				var ev_length = drag_event._event_length;//this._get_real_event_length(ev.start_date, ev.end_date, obj);
				var current_back_shift = this._get_fictional_event_length(end_date, drag_event._move_delta, obj, true);
				end_date = new Date(end_date - current_back_shift);
			} else {
				// converting basically to start_date
				end_date = scheduler.date.add(end_date, drag_event._move_delta, "minute");
			}
		}

		if (this._drag_mode == "resize" && ev){
			if(this.config.timeline_swap_resize && this._drag_id){
				if(this._drag_from_start && +end_date> +ev.end_date){
					this._drag_from_start = false;
				}else if(!this._drag_from_start && +end_date < +ev.start_date){
					this._drag_from_start = true;
				}
			}
			pos.resize_from_start = this._drag_from_start;
			if(!this.config.timeline_swap_resize && this._drag_id){
				if(this._drag_from_start && +end_date >= +scheduler.date.add(ev.end_date, -scheduler.config.time_step, "minute")){
					end_date = scheduler.date.add(ev.end_date, -scheduler.config.time_step, "minute");
				}
			}
		}

		if (obj.round_position) {
			switch(this._drag_mode) {
				case "move":
					if (!this.config.preserve_length){
						end_date = scheduler._timeline_get_rounded_date.call(obj, end_date, false);
						// to preserve original start and end dates
						if(obj.x_unit == "day")//only make sense for whole-day cells
							pos.custom = false;
					}
					break;
				case "resize":
					if(this._drag_event){
						// will save and use resize position only once
						if (this._drag_event._resize_from_start === null || this._drag_event._resize_from_start === undefined) {
							this._drag_event._resize_from_start = pos.resize_from_start;
						}
						pos.resize_from_start = this._drag_event._resize_from_start;
						end_date = scheduler._timeline_get_rounded_date.call(obj, end_date, !this._drag_event._resize_from_start);
					}
					break;
			}
		}

		this._resolve_timeline_section(obj, pos);
		if(pos.section){
			// update draggable event with current section
			this._update_timeline_section({pos:pos, event:this.getEvent(this._drag_id), view:obj});
		}
		pos.y = Math.round((this._correct_shift(end_date,1)-this._min_date)/(1000*60*this.config.time_step));
		pos.shift = this.config.time_step; //step_diff;

		if (obj.round_position && this._drag_mode == "new-size") {
			if(end_date <= this._drag_start){
				pos.shift = scheduler.date.add(this._drag_start, obj.x_step, obj.x_unit) - this._drag_start;
			}
		}

		var pos_changed = this._is_pos_changed(this._drag_pos, pos);
		if(this._drag_pos && pos_changed){
			this._drag_event._dhx_changed = true;
		}
		if(!pos_changed && !this._drag_pos.has_moved)
			pos.force_redraw = false;

		return pos;
	};
};

scheduler._prepare_timeline_events = function(timeline){
	var evs = [];
	if (timeline.render == "cell"){
		evs = scheduler._timeline_trace_events.call(timeline);
	} else {

		var tevs = scheduler.get_visible_events();
		var order = timeline.order;

		for (var j = 0; j < tevs.length; j++) {
			var tev = tevs[j];
			var tev_section = tev[timeline.y_property];
			var index = timeline.order[ tev_section ];
			var sectionObject = timeline.y_unit[index];

			if (timeline.show_unassigned && !tev_section) {
				for (var key in order) {
					if (order.hasOwnProperty(key)) {
						index = order[key];
						if (!evs[index]) evs[index] = [];
						var clone = scheduler._lame_copy({}, tev);
						clone[timeline.y_property] = key;
						evs[index].push(clone);
						break;
					}
				}
			} else {
				// required as we could have index of not displayed section or "undefined"
				if (!evs[index]) evs[index] = [];
				evs[index].push(tev);
			}
		}

		//if(timeline.cell_template){
		evs.$matrix = scheduler._timeline_trace_events.call(timeline);
		//}


	}
	return evs;
};

scheduler._populate_timeline_rendered = function(container){
	scheduler._rendered = [];
	var divs = container.querySelectorAll("div[event_id]");
	for (var i=0; i < divs.length; i++){
		scheduler._rendered.push(divs[i]);
	}
};

scheduler._get_timeline_event_height = function(ev, config){
	var section = ev[config.y_property]; // section id
	var event_height = config.event_dy;
	if (config.event_dy == "full") {
		if (config.section_autoheight) {
			event_height = config._section_height[section] - 6;
		} else {
			event_height = config.dy - 3;
		}
	}

	if (config.resize_events) {
		event_height = Math.max(Math.floor(event_height / (ev._count||1)), config.event_min_dy);
	}
	return event_height;
};
scheduler._get_timeline_event_y = function(order, event_height){
	var sorder = order || 0;
	var y = 2+sorder*event_height+(sorder?(sorder*2):0); // original top + number_of_events * event_dy + default event top/bottom borders
	if (scheduler.config.cascade_event_display) {
		y =2+sorder*scheduler.config.cascade_event_margin+(sorder?(sorder*2):0);
	}
	return y;
};

scheduler.render_timeline_event = function(ev, attach){
	var section = ev[this.y_property]; // section id
	if (!section)
		return ""; // as we may await html

	var sorder = ev._sorder;

	var x_start = scheduler._timeline_getX(ev, false, this);
	var x_end = scheduler._timeline_getX(ev, true, this);

	var event_height = scheduler._get_timeline_event_height(ev, this);

	var hb = event_height - 2;// takes into account css sizes (border/padding)
	if (!ev._inner && this.event_dy == "full") {
		hb=(hb+2)*(ev._count-sorder)-2;
	}

	hb += 3;// correction for border-box sizing

	var y = scheduler._get_timeline_event_y(ev._sorder, event_height);
//	if(isNaN(y) || isNaN(hb)){
//		debugger;
//	}
	var section_height = event_height+y+2;
	if(!this._events_height[section] || (this._events_height[section] < section_height)){
		this._events_height[section] = section_height;
	}

	var cs = scheduler.templates.event_class(ev.start_date,ev.end_date,ev);
	cs = "dhx_cal_event_line "+(cs||"");

	if(scheduler.getState().select_id == ev.id){
		cs += " dhx_cal_event_selected";
	}

	if(ev._no_drag_move){
		cs += " no_drag_move";
	}

	var bg_color = (ev.color?("background:"+ev.color+";"):"");
	var color = (ev.textColor?("color:"+ev.textColor+";"):"");
	var text = scheduler.templates.event_bar_text(ev.start_date,ev.end_date,ev);


	var html="<div "+scheduler._waiAria.eventBarAttrString(ev)+" event_id='"+ev.id+"' class='"+cs+"' style='"+bg_color+color+"position:absolute; top:"+y+"px; height: "+hb+"px; "+(scheduler.config.rtl ? "right:":"left:")+x_start+"px; width:"+Math.max(0,x_end-x_start)+"px;"+(ev._text_style||"")+"'>";
	if (scheduler.config.drag_resize && !scheduler.config.readonly) {
		var dhx_event_resize = 'dhx_event_resize';

		var hb_local = hb + 1; // corrected hb after changing table to divs, position of resize markers were rendered wrong
		var resize_start = "<div class='"+dhx_event_resize+" "+dhx_event_resize+"_start' style='height: "+hb_local+"px;'></div>";
		var resize_end = "<div class='"+dhx_event_resize+" "+dhx_event_resize+"_end' style='height: "+hb_local+"px;'></div>";
		html += (!ev._no_resize_start ? resize_start : "") + (!ev._no_resize_end ? resize_end : "");
	}
	html += (text+'</div>');

	if (!attach)
		return html;
	else {
		var d = document.createElement("div");
		d.innerHTML = html;

		var parentSection = this._scales[section];
		if (parentSection){
			scheduler._rendered.push(d.firstChild);
			parentSection.appendChild(d.firstChild);
		}
	}
};

function getChildrenIds(root, result){
	result = result || [];
	if(root.children){
		for(var i = 0; i < root.children.length; i++){
			result.push(root.children[i].key);
			getChildrenIds(root.children[i], result);
		}
	}
	return result;
}

function getSectionIndex(sectionId, timeline){
	var sectionIndex = timeline.order[sectionId];
	if(sectionIndex === undefined){
		// row inside a collapsed branch
		sectionIndex = "$_" + sectionId;
	}
	return sectionIndex;
}

function iterateSectionsTree(root, result){
	result[root.key] = root;
	if(root.children){
		for(var i = 0; i < root.children.length; i++){
			iterateSectionsTree(root.children[i], result);
		}
	}
}

function buildSectionsHash(timeline){
	var result = {};
	var units = timeline.y_unit_original || timeline.y_unit;
	for(var i = 0; i < units.length; i++){
		iterateSectionsTree(units[i], result);

	}
	return result;

}

function prepareCellMatrix(events, timeline){
	var matrix =[];
	for (var i=0; i < timeline.y_unit.length; i++){
		matrix[i]=[];
	}

	//next code defines row for undefined key
	//most possible it is an artifact of incorrect configuration
	var sectionIndex;
	if (!matrix[sectionIndex]){
		matrix[sectionIndex]=[];
	}

	var sectionsSearch = buildSectionsHash(timeline);

	var fillFolders = timeline.render == "tree";
	if(fillFolders){
		matrix.$tree = {};
	}

	function fillXArray(matrix, sectionIndex, xFrom, xTo){
		if(!matrix[sectionIndex]){
			matrix[sectionIndex]=[];
		}
		for(var x = xFrom; x <= xTo; x++){
			if (!matrix[sectionIndex][x]) matrix[sectionIndex][x]=[];
			matrix[sectionIndex][x].push(event);
		}
	}

	var sectionProperty = timeline.y_property;
	for (var i=0; i < events.length; i++) {
		var event = events[i];
		var sectionKey = event[sectionProperty];
		sectionIndex = getSectionIndex(sectionKey, timeline);
		var scaleIndexStart = scheduler._get_date_index(timeline, event.start_date);
		var scaleIndexEnd = scheduler._get_date_index(timeline, event.end_date);
		if(event.end_date.valueOf() == timeline._trace_x[scaleIndexEnd].valueOf()){
			scaleIndexEnd -= 1;
		}

		if(!matrix[sectionIndex]){
			matrix[sectionIndex]=[];
		}

		fillXArray(matrix, sectionIndex, scaleIndexStart, scaleIndexEnd);

		var current = sectionsSearch[sectionKey];
		if(fillFolders && current && current.$parent){
			var traversed = {};
			
			while(current.$parent){
				if(traversed[current.key]) {
					throw new Error("Invalid sections tree. Section `{key:'" + current.key + "', label:'"+current.label+"'}` " +
					"has the same key as one of its parents. Make sure all sections have unique keys");
				}
				traversed[current.key] = true;

				var parent = sectionsSearch[current.$parent];
				fillXArray(matrix.$tree, parent.key, scaleIndexStart, scaleIndexEnd);
				current = parent;
			}
		}
	}

	return matrix;
}

var escapeForAttribute = function(rawValue){
	var value = String(rawValue);
	return value.replace(/'/g, "&apos;").replace(/"/g, '&quot;');
};
var escapeForSelector = function(rawValue){
	var value = String(rawValue);
	return value.replace(/'/g, "\\'").replace(/"/g, '\\"');
};

scheduler._timeline_trace_events = function trace_events(){
	//minimize event set
	var evs = scheduler.get_visible_events();
	var matrix = prepareCellMatrix(evs, this);
	//if(this.render == "tree"){
	//	fillFolderEvents(matrix, this);
	//}
	return matrix;
};

// function used to get X (both start and end) coordinates for timeline bar view
scheduler._timeline_getX = function _getX(ev, isEndPoint, config) {
	var x = 0;
	var step = config._step;
	var round_position = config.round_position;

	var column_offset = 0;
	var date = (isEndPoint) ? ev.end_date : ev.start_date;

	if(date.valueOf()>scheduler._max_date.valueOf())
		date = scheduler._max_date;
	var delta = date - scheduler._min_date_timeline;

	if (delta > 0){
		var index = scheduler._get_date_index(config, date);
		if (scheduler._ignores[index])
			round_position=true;

		for (var i = 0; i < index; i++) {
			x += scheduler._cols[i];
		}

		var column_date = scheduler._timeline_get_rounded_date.apply(config, [date, false]);
		//var column_date = scheduler.date.add(scheduler._min_date_timeline, scheduler.matrix[scheduler._mode].x_step*index, scheduler.matrix[scheduler._mode].x_unit);
		if (!round_position) {
			delta = date - column_date;
			if (config.first_hour || config.last_hour){
				delta = delta - config._start_correction;
				if (delta < 0) delta = 0;
				column_offset = Math.round(delta/step);
				if (column_offset > scheduler._cols[index])
					column_offset = scheduler._cols[index];
			} else {
				column_offset = Math.round(delta/step);
			}
		} else {
			if (+date > +column_date && isEndPoint) {
				column_offset = scheduler._cols[index];
			}
		}
	}

	var borderBox = scheduler._border_box_events();

	if (isEndPoint) {
		// special handling for "round" dates which match columns and usual ones
		if (delta !== 0 && !round_position) {
			x += column_offset;
		} else {
			x += column_offset - 2;
		}
	} else {
		x += column_offset+1;
	}
	return x;
};

scheduler._timeline_get_rounded_date = function get_rounded_date(date, isEndDate) {
	var index = scheduler._get_date_index(this, date);
	var rounded_date = this._trace_x[index];
	if (isEndDate && (+date != +this._trace_x[index])) {
		rounded_date = (this._trace_x[index+1]) ? this._trace_x[index+1] : scheduler.date.add(this._trace_x[index], this.x_step, this.x_unit);
	}
	return new Date(rounded_date);
};

scheduler._timeline_skip_ignored = function skip_ignored(evs){

	if(scheduler._ignores_detected){
		var from,
			to,
			visible,
			ev;

		for(var i = 0; i < evs.length; i++){
			ev = evs[i];
			visible = false;
			from = scheduler._get_date_index(this, ev.start_date);
			to = scheduler._get_date_index(this, ev.end_date);

			while(from < to){
				if(!scheduler._ignores[from]){
					visible = true;
					break;
				}
				from++;
			}
			if(!visible && from == to && !scheduler._ignores[to]){
				if(+ev.end_date > +this._trace_x[to]){
					visible = true;
				}
			}
			if(!visible){
				evs.splice(i, 1);
				i--;
			}
		}
	}
};

// calculates timeline event sorder and update timeline section heights
scheduler._timeline_calculate_event_positions = function(evs){
	if (evs && this.render != "cell"){

		scheduler._timeline_skip_ignored.call(this, evs);

		evs.sort(this.sort || function(a,b){
			if(a.start_date.valueOf()==b.start_date.valueOf())
				return a.id>b.id?1:-1;
			return a.start_date>b.start_date?1:-1;
		});
		var stack=[];
		var evs_length = evs.length;
		var maxOrder = -1, maxOrderEvent = null;

		// prepare events for render
		for (var j=0; j<evs_length; j++){
			var ev = evs[j];
			ev._inner = false;

			var ev_start_date = (this.round_position) ? scheduler._timeline_get_rounded_date.apply(this, [ev.start_date, false]) : ev.start_date;
			var ev_end_date = (this.round_position) ? scheduler._timeline_get_rounded_date.apply(this, [ev.end_date, true]) : ev.end_date;

			// cutting stack from the last -> first event side
			while (stack.length) {
				var stack_ev = stack[stack.length-1];
				if (stack_ev.end_date.valueOf() <= ev_start_date.valueOf()) {
					stack.splice(stack.length-1,1);
				} else {
					break;
				}
			}

			// cutting stack from the first -> last event side
			var sorderSet = false;
			for(var p=0; p<stack.length; p++){
				var t_ev = stack[p];
				if(t_ev.end_date.valueOf() <= ev_start_date.valueOf()){
					sorderSet = true;
					ev._sorder=t_ev._sorder;
					stack.splice(p,1);
					ev._inner=true;
					break;
				}
			}


			if (stack.length)
				stack[stack.length-1]._inner=true;


			if (!sorderSet) {
				if (stack.length) {
					if (stack.length <= stack[stack.length - 1]._sorder) {
						if (!stack[stack.length - 1]._sorder)
							ev._sorder = 0;
						else
							for (var h = 0; h < stack.length; h++) {
								var _is_sorder = false;
								for (var t = 0; t < stack.length; t++) {
									if (stack[t]._sorder == h) {
										_is_sorder = true;
										break;
									}
								}
								if (!_is_sorder) {
									ev._sorder = h;
									break;
								}
							}
						ev._inner = true;
					}
					else {
						var _max_sorder = stack[0]._sorder;
						for (var w = 1; w < stack.length; w++)
							if (stack[w]._sorder > _max_sorder)
								_max_sorder = stack[w]._sorder;
						ev._sorder = _max_sorder + 1;
						if(maxOrder < ev._sorder){
							maxOrder = ev._sorder;
							maxOrderEvent = ev;
						}
						ev._inner = false;
					}
				}
				else
					ev._sorder = 0;
			}

			stack.push(ev);

			if (stack.length>(stack.max_count||0)) {
				stack.max_count=stack.length;
				ev._count=stack.length;
			}
			else {
				ev._count=(ev._count)?ev._count:1;
			}
		}
		// fix _count for every event
		for (var m=0; m < evs.length; m++) {
			evs[m]._count = stack.max_count;
			// if multisection events are enabled - store a copy to be rendered in order to have access to dynamic _count/_index properties
			if(scheduler._register_copy){
				scheduler._register_copy(evs[m]);
			}
		}

		if(maxOrderEvent || evs[0]){
			scheduler.render_timeline_event.call(this, maxOrderEvent || evs[0], false);
		}
	}
};

scheduler._timeline_get_events_html = function get_events_html(evs) {
	var html = "";
	if (evs && this.render != "cell"){
		// render events
		for (var v=0; v<evs.length; v++) {
			html+=scheduler.render_timeline_event.call(this, evs[v], false);
		}
	}
	return html;
};

scheduler._timeline_update_events_html = function get_events_html(evs) {
	var html = "";
	if (evs && this.render != "cell"){

		var view = scheduler.getView();
		// cleanup previously rendered events
		var ids = {};
		var getEventKey = function(eventId, sectionProperty){
			return eventId + '_' + sectionProperty;
		};
		evs.forEach(function(event){
			ids[getEventKey(event.id, event[view.y_property])] = true;
		});
		scheduler._rendered.forEach(function(element){
			if(element.parentNode){
				var sectionId = element.parentNode.getAttribute("data-section-id");
				if(ids[getEventKey(element.getAttribute("event_id"), sectionId)]){
					element.parentNode.removeChild(element);
				}
			}
		});

		// render events
		for (var v=0; v<evs.length; v++) {
			html+=scheduler.render_timeline_event.call(this, evs[v], false);
		}
	}
	return html;
};

// define scrollbar width once for correct height of label_wrapper
function getScrollbarwidth() {
	var inner = document.createElement('p');
	inner.style.width = "100%";
	inner.style.height = "200px";

	var outer = document.createElement('div');
	outer.style.position = "absolute";
	outer.style.top = "0px";
	outer.style.left = "0px";
	outer.style.visibility = "hidden";
	outer.style.width = "200px";
	outer.style.height = "150px";
	outer.style.overflow = "hidden";
	outer.appendChild(inner);

	document.body.appendChild(outer);
	var w1 = inner.offsetWidth;
	outer.style.overflow = 'scroll';
	var w2 = inner.offsetWidth;

	if (w1 == w2) {
		w2 = outer.clientWidth;
	}

	document.body.removeChild(outer);

	return (w1 - w2);
}

// calculate general stats for main blocks (divs)
scheduler._timeline_get_block_stats = function (d, view) {
	var stats = {};

	view._sch_height = d.offsetHeight;

	// define height of dhx_timeline_data_wrapper and dhx_timeline_label_wrapper
	stats.style_data_wrapper = (scheduler.config.rtl ? "padding-right:": "padding-left:") + view.dx + "px;";
	stats.style_label_wrapper = "width: " + view.dx + "px;";
	if (view.scrollable) {

		stats.style_data_wrapper += "height:" + (view._sch_height - 1) + "px;";
		if (view.html_scroll_width === undefined) // define once for correct height of label_wrapper
			view.html_scroll_width = getScrollbarwidth();
		if(view._section_autowidth){
			view.custom_scroll_width = 0;
		}else{
			view.custom_scroll_width = view.html_scroll_width;
		}

		stats.style_label_wrapper  += "height:" + (view._sch_height - 1 - view.custom_scroll_width) + "px;";
	}else{
		stats.style_data_wrapper += "height:" + (view._sch_height - 1) + "px;";
		stats.style_label_wrapper  += "height:" + (view._sch_height - 1) + "px;overflow:visible;";
	}
	return stats;
};

// calculate stats for current row
scheduler._timeline_get_cur_row_stats = function(view, i) {
	var stats = view._logic(view.render, view.y_unit[i], view); // obj with custom style

	scheduler._merge(stats, {
		height: view.dy
	});

	// autosize height, if we have a free space
	if (view.section_autoheight) {
		var heightWithoutScroll = view.scrollable ? view._sch_height - scheduler.xy.scroll_width : view._sch_height;
		if (view.y_unit.length * stats.height < heightWithoutScroll) {
			stats.height = Math.max(stats.height, Math.floor((heightWithoutScroll - 1) / view.y_unit.length));
		}
	}

	view._section_height[view.y_unit[i].key] = stats.height;

	if(!stats.td_className){
		stats.td_className = "dhx_matrix_scell"+((scheduler.templates[view.name+"_scaley_class"](view.y_unit[i].key, view.y_unit[i].label, view.y_unit[i]))?" "+scheduler.templates[view.name+"_scaley_class"](view.y_unit[i].key, view.y_unit[i].label, view.y_unit[i]):'');
	}
	if(!stats.td_content){
		stats.td_content = scheduler.templates[view.name+'_scale_label'](view.y_unit[i].key, view.y_unit[i].label, view.y_unit[i]);
	}
	scheduler._merge(stats, {
		//section 1
		tr_className: "",
		style_height: "height:"+stats.height+"px;",
		style_width: "width:"+(view.dx)+"px;",
		//section 2
		summ_width: "width:"+view._summ+"px;",
		//section 3
		table_className: ''
	});

	return stats;
};

// calculate stats for fit_events
scheduler._timeline_get_fit_events_stats = function(view, i, stats) {
	if(view.fit_events){
		var rendered_height = view._events_height[view.y_unit[i].key]||0;
		stats.height = (rendered_height>stats.height)?rendered_height:stats.height;
		stats.style_height = "height:"+stats.height+"px;";
		stats.style_line_height = "line-height:" + (stats.height - 1) + "px;";
		view._section_height[view.y_unit[i].key] = stats.height;
	}
	stats.style_height = "height:"+stats.height+"px;";
	stats.style_line_height = "line-height:" + (stats.height - 1) + "px;";
	view._section_height[view.y_unit[i].key] = stats.height;

	return stats;
};

/* scroll */
// set scroll positions that were saved previously
scheduler._timeline_set_scroll_pos = function(d, view) {
	var dataWrapperDiv = d.querySelector('.dhx_timeline_data_wrapper');
	dataWrapperDiv.scrollTop = view._y_scroll || 0;
	view.scrollHelper.setScrollValue(dataWrapperDiv, view._x_scroll || 0);
	if (view.scrollHelper.getMode() != view.scrollHelper.modes.maxMin && dataWrapperDiv.scrollLeft == view._summ - dataWrapperDiv.offsetWidth + view.dx) dataWrapperDiv.scrollLeft += getScrollbarwidth();
};

// save current scroll positions
scheduler._timeline_save_scroll_pos = function(view, scrollTop, scrollLeft, scrollWidth) {
	view._y_scroll = scrollTop || 0;
	view._x_scroll = scrollLeft || 0;
};
/* scroll end */

/* get html section */
// cell mode

scheduler._timeline_get_html_for_cell_data_row = function(i, stats, top_pos, rowId, templateParams) {
	var css = "";
	if(templateParams.template){
		css += " " + (templateParams.template(templateParams.section, templateParams.view)||"");
	}

	return "<div class='dhx_timeline_data_row"+css+"' data-section-id='"+escapeForAttribute(rowId)+"' data-section-index='" + i + "' style='" +
		stats.summ_width + stats.style_height + " position:absolute; top:" + (top_pos) + "px;'>";
};

scheduler._timeline_get_html_for_cell_ignores = function(stats) {
	return '<div class="dhx_matrix_cell dhx_timeline_data_cell" style="' + stats.style_height + stats.style_line_height + ';display:none"></div>';
};

scheduler._timeline_get_html_for_cell = function(x_ind, y_ind, view, ev, stats, cellLeftPos) {
	var cellDate = view._trace_x[x_ind];
	var cellSection = view.y_unit[y_ind];
	var cellWidth = scheduler._cols[x_ind];

	var cellDateString = timelineCellDateAttribute(cellDate);

	var content = scheduler.templates[view.name + "_cell_value"](ev, cellDate, cellSection);
	return "<div data-col-id='"+x_ind+"' data-col-date='"+cellDateString+"' class='dhx_matrix_cell dhx_timeline_data_cell " +
		scheduler.templates[view.name + "_cell_class"](ev, cellDate, cellSection) +
		"' style='width:" + (cellWidth) + "px;" + (stats.style_height) + stats.style_line_height + (scheduler.config.rtl ? " right:" : "  left:") + (cellLeftPos) + "px;'>" +
		"<div style='width:auto'>" + content + "</div></div>";
};

// bar mode
scheduler._timeline_get_html_for_bar_matrix_line = function(i, stats, top_pos, rowId) {
	return "<div style='" + stats.summ_width + " " + stats.style_height + " position:absolute; top:"+top_pos+"px;' data-section-id='"+escapeForAttribute(rowId)+"' data-section-index='"+i+"' class='dhx_matrix_line'>";
};

scheduler._timeline_get_html_for_bar_data_row = function(stats, templateParams) {
	var css = stats.table_className;
	if(templateParams.template){
		css += " " + (templateParams.template(templateParams.section, templateParams.view)||"");
	}
	return "<div class='dhx_timeline_data_row " + css + "' style='" + stats.summ_width + " " + stats.style_height + "' >";
};

scheduler._timeline_get_html_for_bar_ignores = function() {
	return "";// "<div></div>";
};

function timelineCellDateAttribute (cellDate){
	return scheduler._helpers.formatDate(cellDate);
}

scheduler._timeline_get_html_for_bar = function(x_ind, y_ind, view, ev, cellLeftPos, nestedEvents) {

	var cellDate = timelineCellDateAttribute(view._trace_x[x_ind]);
	var cellSection = view.y_unit[y_ind];

	var content = "";
	if(view.cell_template){
		content = scheduler.templates[view.name + "_cell_value"](ev, view._trace_x[x_ind], cellSection, nestedEvents);
	}

	var lineHeight = "line-height:" + view._section_height[cellSection.key] + "px;";

	return "<div class='dhx_matrix_cell dhx_timeline_data_cell " +
		scheduler.templates[view.name + "_cell_class"](ev, view._trace_x[x_ind], cellSection, nestedEvents) +
		"' style='width:" + (scheduler._cols[x_ind]) + "px; " + (scheduler.config.rtl ? "right:" : "left:") + (cellLeftPos) + "px;'  data-col-id='"+ x_ind +"' data-col-date='"+cellDate+"' >"+
		"<div style='width:auto; height:100%;position:relative;"+lineHeight+"'>" + content + "</div></div>";
};
/* get html section end */



scheduler._timeline_render_scale_header = function(view, show){
	var element = scheduler.$container.querySelector(".dhx_timeline_scale_header");
	if(element){
		element.parentNode.removeChild(element);
	}
	if(!show){
		return;
	}

	element = document.createElement("div");
	var headerAreaClass = "dhx_timeline_scale_header";
	if(view.second_scale){
		headerAreaClass += " dhx_timeline_second_scale";
	}

	var headerHeight = scheduler.xy.scale_height;
	element.className = headerAreaClass;
	element.style.cssText = [
		"width:"  + (view.dx - 1) + "px",
		"height:" + (headerHeight) + "px",
		"line-height:" + (headerHeight) + "px",
		"top:"    + (scheduler.xy.nav_height + 2) + "px",
		(scheduler.config.rtl ? "right:0" : "left:0")
	].join(";");
	element.innerHTML = scheduler.locale.labels[view.name+"_scale_header"] || '';

	scheduler.$container.appendChild(element);
};

function getScrollableContainer(root, view){
	var dataWrapperDiv = root.querySelector('.dhx_timeline_data_wrapper');
	if (!view.scrollable){
		dataWrapperDiv = scheduler.$container.querySelector(".dhx_cal_data");
	}
	return dataWrapperDiv;
}

function getLabelContainer(root){
	return root.querySelector('.dhx_timeline_label_wrapper');
}

function getColumnLabelContainer(){
	return scheduler.$container.querySelector(".dhx_cal_data .dhx_timeline_label_col");
}

// define timeline scroll behavior and attach onscroll event
// define timeline scroll behavior and attach onscroll event
function initScroll(d, view, heights, render_stats) {
	view._is_ev_creating = false;

	var dataWrapperDiv = getScrollableContainer(d, view);
	// attach scroll events for dhx_cal_header - horizontal
	// and dhx_timeline_label_col div - vertical
	var header = scheduler._els["dhx_cal_header"][0];

	function onLabelWrapperDivWheel(e) {
		e = e || window.event;
		if(e.shiftKey) return;
		var dy = e.deltaY || e.detail|| (-e.wheelDelta);
		dy = dy < 0 ? -100 : 100; // to optimize for all browsers
		dataWrapperDiv.scrollTop += dy;
		if(e.preventDefault){
			e.preventDefault();
		}
	}
	// add ability to scroll over timeline_label_wrapper
	var labelWrapperDiv = getLabelContainer(d);
	if(labelWrapperDiv){ // only for vertical scrolling
		if (labelWrapperDiv.addEventListener) {
			if ('onwheel' in document) {
				labelWrapperDiv.addEventListener("wheel", onLabelWrapperDivWheel);
			} else if ('onmousewheel' in document) { // old version of onwheel
				labelWrapperDiv.addEventListener("mousewheel", onLabelWrapperDivWheel);
			}
		} else { // IE8-
			labelWrapperDiv.attachEvent("onmousewheel", onLabelWrapperDivWheel);
		}

		if (!labelWrapperDiv.$eventsAttached) {
			labelWrapperDiv.$eventsAttached = true;
			var prevLabelAction = { pageX: 0, pageY: 0 };
			labelWrapperDiv.addEventListener("touchstart", function (e) {
				var touch = e;
				if (e.touches) {
					touch = e.touches[0];
				}
				prevLabelAction = { pageX: touch.pageX, pageY: touch.pageY };
			});
			labelWrapperDiv.addEventListener("touchmove", function (e) {
				var touch = e;
				if (e.touches) {
					touch = e.touches[0];
				}
				var dy = prevLabelAction.pageY - touch.pageY;
				prevLabelAction = { pageX: touch.pageX, pageY: touch.pageY };
				if (dy) {
					dataWrapperDiv.scrollTop += dy;
				}
				if (e && e.preventDefault)
					e.preventDefault();
			});
		}
	}

	// rerender view
	var frameRequest;

	dataWrapperDiv.onscroll = function (e) {
		var element = getScrollableContainer(d, view);
		var scrollTop = element.scrollTop;
		var scrollLeft = view.scrollHelper.getScrollValue(element);
		var viewPort = scheduler._timeline_smart_render.getViewPort(view.scrollHelper, 0, scrollLeft, scrollTop);
		var colLabelDiv = getColumnLabelContainer();
		if(view.scrollable){
			colLabelDiv.style.top = (-scrollTop) + 'px';
		}

		if(view.smart_rendering === false){
			return;
		}

		if (scrollLeft !== view._x_scroll || view._is_ev_creating) {
			if (view.second_scale)
				scheduler._timeline_smart_render.updateHeader(view, viewPort, header.children[1]);
			else
				scheduler._timeline_smart_render.updateHeader(view, viewPort, header.children[0]);
		}

		if (scheduler.config.rtl){
			var labelWrapperHeight = +scheduler.$container.querySelector(".dhx_timeline_label_wrapper").style.height.replace("px", "");
			var scalesHeight = view._section_height[view.y_unit.length] + view._label_rows[view._label_rows.length - 1].top;

			if (view.scrollHelper.getMode() == view.scrollHelper.modes.minMax && (scalesHeight > labelWrapperHeight || view.render == "tree")) {
				header.style.right   = (-1 - scrollLeft - getScrollbarwidth()) + 'px';
			}
			else header.style.right   = (-1 - scrollLeft) + 'px';

			header.style.left   = 'unset';
		} else {
			header.style.left   = (-1 - scrollLeft) + 'px';
		}

		if (view._options_changed || scrollTop !== view._y_scroll  || view._is_ev_creating) {
			scheduler._timeline_smart_render.updateLabels(view, viewPort, colLabelDiv);
		}



		view._is_ev_creating = false;

		scheduler._timeline_smart_render.updateGridCols(view, viewPort);
		scheduler._timeline_smart_render.updateGridRows(view, viewPort);

		var asyncScroll = false;
		if (view.render != 'cell') {
			if (window.requestAnimationFrame) {
				asyncScroll = true;
				if (frameRequest) {
					cancelAnimationFrame(frameRequest);
				}

				frameRequest = requestAnimationFrame(function () {
					if(view.name !== scheduler.getState().mode){
						return;
					}
					scheduler._timeline_smart_render.updateEvents(view, viewPort);
					frameRequest = 0;
					view.callEvent("onScroll", [view.scrollHelper.getScrollValue(dataWrapperDiv), dataWrapperDiv.scrollTop]);
				});
			} else {
				scheduler._timeline_smart_render.updateEvents(view, viewPort);
			}
		}

		var dataColHeight = 0;
		view._scales = {};
		var rows;

		if (view.render === 'cell')
			rows = element.querySelectorAll('.dhx_timeline_data_col .dhx_timeline_data_row');
		else
			rows = element.querySelectorAll('.dhx_timeline_data_col .dhx_matrix_line');

		for (var i= 0, len = rows.length; i < len; i++) {
			var unit_key = rows[i].getAttribute("data-section-id");
			var rowIndex = view.order[unit_key];

			heights[rowIndex] = render_stats[rowIndex].height;
			view._scales[unit_key] = rows[i];
		}

		for (var i= 0, len = heights.length; i < len; i++) {
			dataColHeight+= heights[i];
		}

		var scrDiv = scheduler.$container.querySelector('.dhx_timeline_data_col');
		scrDiv.style.height = dataColHeight + "px";
		var newTop = element.scrollTop;
		var newLeft = view.scrollHelper.getScrollValue(element);
		var scrollWidth = view._summ - scheduler.$container.querySelector('.dhx_cal_data').offsetWidth + view.dx + view.custom_scroll_width;
		scheduler._timeline_save_scroll_pos(view, newTop, newLeft, scrollWidth);
		if (!asyncScroll) {
			view.callEvent("onScroll", [newLeft, newTop]);
		}
		view._is_new_view = false;
	};

	if (!dataWrapperDiv.$eventsAttached) {
		dataWrapperDiv.$eventsAttached = true;
		var prevAction = { pageX: 0, pageY: 0 };
		dataWrapperDiv.addEventListener("touchstart", function (e) {
			var touch = e;
			if (e.touches) {
				touch = e.touches[0];
			}
			prevAction = { pageX: touch.pageX, pageY: touch.pageY };
		});
		dataWrapperDiv.addEventListener("touchmove", function (e) {
			var touch = e;
			if (e.touches) {
				touch = e.touches[0];
			}
			var colLabelDiv = getColumnLabelContainer();
			var dx = prevAction.pageX - touch.pageX;
			var dy = prevAction.pageY - touch.pageY;
			prevAction = { pageX: touch.pageX, pageY: touch.pageY };

			if ((dx || dy) && !scheduler.getState().drag_id) {
				// add a threshold for secondary axis movement
				var absoluteDx = Math.abs(dx);
				var absoluteDy = Math.abs(dy);
				var totalDistance = Math.sqrt(dx*dx + dy*dy);
				var horizontalComponent = absoluteDx / totalDistance;//sin
				var verticalComponent = absoluteDy / totalDistance;//cos
				if (horizontalComponent < 0.42) {// < 25 degree angle
					dx = 0;
				} else if (verticalComponent < 0.42) {// < 65 degree angle
					dy = 0;
				}


				view.scrollHelper.setScrollValue( dataWrapperDiv, view.scrollHelper.getScrollValue(dataWrapperDiv) + dx);

				dataWrapperDiv.scrollTop += dy;

				if (view.scrollable && dy) {
					colLabelDiv.style.top = (-dataWrapperDiv.scrollTop) + 'px';
				}
			}
			if (e && e.preventDefault)
				e.preventDefault();
			return false;
		});
	}

	if (view.scroll_position && view._is_new_view) {
		// set scroll position once on scheduler init and save it to timeline obj
		view.scrollTo(view.scroll_position);
	} else {
		scheduler._timeline_set_scroll_pos(d, view);
	}

	view._is_ev_creating = true;
}

scheduler._timeline_y_scale = function y_scale(d) {
	// main code for _timeline_y_scale starts here
	var block_stats = scheduler._timeline_get_block_stats(d, this);

	// _section_autowidth works for scrollable=true and defines is scroll or autosize (width) needed
	var scrollableData = !this.scrollable ? '' : ' dhx_timeline_scrollable_data';

	var html = "<div class='dhx_timeline_table_wrapper'>" ;
	var labelWrapper  = "<div class='dhx_timeline_label_wrapper' style='"+block_stats.style_label_wrapper+"'>" +
		"<div class='dhx_timeline_label_col'>";
	var dataWrapper = "<div class='dhx_timeline_data_wrapper" + scrollableData + "' style='"+block_stats.style_data_wrapper+"'>" +
		"<div class='dhx_timeline_data_col'>";

	if(scheduler._load_mode)
		scheduler._load();

	scheduler._timeline_smart_render.clearPreparedEventsCache(evs);
	var evs = scheduler._timeline_smart_render.getPreparedEvents(this);
	scheduler._timeline_smart_render.cachePreparedEvents(evs);

	var summ = 0;
	for (var i=0; i < scheduler._cols.length; i++)
		summ+=scheduler._cols[i];

	var step = new Date();
	var realcount = scheduler._cols.length-scheduler._ignores_detected;
	step = ((scheduler.date.add(step, this.x_step*realcount, this.x_unit)-step)-(this._start_correction + this._end_correction)*realcount)/summ;
	this._step = step;
	this._summ = summ;

	var heights = scheduler._colsS.heights=[];
	var render_stats = [];

	this._events_height = {};
	this._section_height = {};
	this._label_rows = [];

	var skipRenderCells = false;
	var cellTopPos = 0;
	var viewPort = null;
	if(this.scrollable || this.smart_rendering){
		viewPort = scheduler._timeline_smart_render.getViewPort(this.scrollHelper, this._sch_height);
	}

	scheduler._timeline_smart_render._rendered_labels_cache = [];
	scheduler._timeline_smart_render._rendered_events_cache = [];

	var scrollableDataContainer = !!viewPort;

	var smartRender = this._smartRenderingEnabled();

	var rowStats = [];
	var totalRowsHeight = 0;
	for (var rowIndex=0; rowIndex<this.y_unit.length; rowIndex++){
		scheduler._timeline_calculate_event_positions.call(this, evs[rowIndex]);
		var stats = scheduler._timeline_get_cur_row_stats(this, rowIndex);
		stats = scheduler._timeline_get_fit_events_stats(this, rowIndex, stats);
		rowStats.push(stats);
		totalRowsHeight += stats.height;
	}

	// if sections were changed viewport should be shifted upwards
	if(viewPort && totalRowsHeight < viewPort.scrollTop){
		viewPort.scrollTop = Math.max(0, totalRowsHeight - viewPort.height);
	}

	for (var rowIndex=0; rowIndex<this.y_unit.length; rowIndex++){
		var stats = rowStats[rowIndex];
		var row = this.y_unit[rowIndex];

		// calculate height of all events but will render below only events in viewport

		// now section 1 = labelWrapper, section 2 = dataWrapper
		var labelRow = "<div class='dhx_timeline_label_row "+stats.tr_className+"' style='top:"+cellTopPos+"px;"+stats.style_height + stats.style_line_height+"'"+"data-row-index='"+rowIndex+"'" +
			" data-row-id='"+escapeForAttribute(row.key)+"'>" +
			"<div class='"+stats.td_className+"' style='"+stats.style_width+" height:"+stats.height+"px;' "+scheduler._waiAria.label(stats.td_content)+">"+stats.td_content+"</div></div>";

		if (smartRender)
			this._label_rows.push({div: labelRow, top: cellTopPos, section: row});

		// check vertical direction
		if (smartRender){
			if (!scheduler._timeline_smart_render.isInYViewPort({top: cellTopPos, bottom: cellTopPos + stats.height}, viewPort)) {
				skipRenderCells = true;
			}
		}
		cellTopPos += stats.height;

		if (skipRenderCells) {
			skipRenderCells = false;
		} else {
			// add label row if wasn't skipped render cells
			labelWrapper += labelRow;

			// save label to cache on first time render
			if (smartRender){
				scheduler._timeline_smart_render._rendered_labels_cache.push(rowIndex);
			}

			var template = scheduler.templates[this.name + "_row_class"];
			var templateParams = { view: this, section: row, template: template};

			// check horizontal direction
			var cellLeftPos = 0;
			if (this.render == "cell") {
				dataWrapper +=scheduler._timeline_get_html_for_cell_data_row(rowIndex, stats, cellTopPos-stats.height, row.key, templateParams);
				for (var colIndex = 0; colIndex < scheduler._cols.length; colIndex++) {
					if (scheduler._ignores[colIndex] && !smartRender)
						dataWrapper += scheduler._timeline_get_html_for_cell_ignores(stats);
					else {
						if (smartRender && scrollableDataContainer) {
							if (scheduler._timeline_smart_render.isInXViewPort({left: cellLeftPos, right: cellLeftPos + scheduler._cols[colIndex]}, viewPort)) {
								dataWrapper += scheduler._timeline_get_html_for_cell(colIndex, rowIndex, this, evs[rowIndex][colIndex], stats, cellLeftPos);
							}
						} else {
							dataWrapper += scheduler._timeline_get_html_for_cell(colIndex, rowIndex, this, evs[rowIndex][colIndex], stats, cellLeftPos);
						}
					}

					cellLeftPos += scheduler._cols[colIndex];

				}
				dataWrapper += '</div>';
			} else {
				//section 2
				dataWrapper += scheduler._timeline_get_html_for_bar_matrix_line(rowIndex, stats, cellTopPos-stats.height, row.key);

				var printableEvents = evs[rowIndex];
				// get events only in viewport
				if (smartRender && scrollableDataContainer) {
					printableEvents = scheduler._timeline_smart_render.getVisibleEventsForRow(this, viewPort, evs, rowIndex);

				}
				var events_html = scheduler._timeline_get_events_html.call(this, printableEvents);


				// adding events
				dataWrapper += events_html;

				// section 3
				dataWrapper += scheduler._timeline_get_html_for_bar_data_row(stats, templateParams);

				for (var colIndex = 0; colIndex < scheduler._cols.length; colIndex++) {
					if (scheduler._ignores[colIndex])
						dataWrapper += scheduler._timeline_get_html_for_bar_ignores();
					else {
						if (smartRender && scrollableDataContainer) {
							if (scheduler._timeline_smart_render.isInXViewPort({left: cellLeftPos, right: cellLeftPos + scheduler._cols[colIndex]}, viewPort)) {
								dataWrapper += scheduler._timeline_get_html_for_bar(colIndex, rowIndex, this, evs[rowIndex], cellLeftPos);
							}
						} else {
							dataWrapper += scheduler._timeline_get_html_for_bar(colIndex, rowIndex, this, evs[rowIndex], cellLeftPos);
						}
					}
					cellLeftPos += scheduler._cols[colIndex];
				}
				dataWrapper += "</div></div>";
			}
		}
		stats.sectionKey = row.key;
		render_stats.push(stats);
	}

	html += labelWrapper  + "</div></div>";
	html += dataWrapper + "</div></div>";
	html += "</div>";

	this._matrix = evs;

	//d.scrollTop = 0; //fix flickering in FF;  disabled as it was impossible to create dnd event if scroll was used (window jumped to the top)
	d.innerHTML = html;

	// set height for absolute positioned scrollable div
	if (smartRender) {
		var scrDiv = scheduler.$container.querySelector('.dhx_timeline_data_col');
		scrDiv.style.height = cellTopPos + "px";
	}

	scheduler._populate_timeline_rendered(d);

	this._scales = {};

	var unit = null;
	for (var i= 0, len = render_stats.length; i < len; i++) {
		heights.push(render_stats[i].height);

		var unit_key = render_stats[i].sectionKey;
		scheduler._timeline_finalize_section_add(this, unit_key, d);
	}

	if (smartRender) {
		if (scheduler._timeline_smart_render) {
			scheduler._timeline_smart_render._rendered_events_cache = [];
		}
	}
	if (smartRender || this.scrollable){
		initScroll(d, this, heights, render_stats);
	}
};

scheduler._timeline_finalize_section_add = function(timeline, sectionKey, container){
	var scale = timeline._scales[sectionKey] = container.querySelector(".dhx_timeline_data_col [data-section-id='"+escapeForSelector(sectionKey)+"']");
	if(scale){
		scheduler.callEvent("onScaleAdd", [scale, sectionKey]);
	}
};

scheduler.attachEvent("onBeforeViewChange", function (old_mode,old_date,mode,date) {
	// set scroll position for previous when dates are switched (not modes)
	if (scheduler.matrix[mode]) {
		var view = scheduler.matrix[mode];

		if (view.scrollable) {
			if (view.render == "tree") {
				if (old_mode === mode && old_date === date) {
					// do not set scroll pos to 0 if it is click on folder
					return true;
				}
			}

			view._x_scroll = view._y_scroll = 0;

			if (scheduler.$container.querySelector('.dhx_timeline_scrollable_data')) {
				scheduler._timeline_set_scroll_pos(scheduler._els["dhx_cal_data"][0], view);
			}
		}
	}

	return true;
});

scheduler._timeline_x_dates = function x_dates(preserve){
	var start = scheduler._min_date;
	var end = scheduler._max_date;

	scheduler._process_ignores(start, this.x_size, this.x_unit, this.x_step, preserve);
	var size = this.x_size + (preserve ? scheduler._ignores_detected : 0);

	var display_count = 0,
		total_count = 0;
	while(+start < +end){
		// dates calculation
		this._trace_x[total_count]=new Date(start);
		if(this.x_unit == "month" && scheduler.date[this.x_unit + "_start"]){
			start = scheduler.date[this.x_unit + "_start"](new Date(start));
		}
		start = scheduler.date.add(start, this.x_step, this.x_unit);
		if(scheduler.date[this.x_unit + "_start"]){
			start = scheduler.date[this.x_unit + "_start"](start);
		}

		if(!scheduler._ignores[total_count])
			display_count++;
		total_count++;

		if(preserve){
			if(display_count <  this.x_size && !(+start < +end)){
				end = scheduler.date["add_" + this.name + "_private"](end, (this.x_length || this.x_size)*this.x_step);
			}else if(display_count >=  this.x_size){
				scheduler._max_date = start;
				break;
			}
		}
	}
	return {total: total_count, displayed: display_count};
};

scheduler._timeline_x_scale = function x_scale(h){
	var current_sh = scheduler.xy.scale_height;
	var original_sh = this._header_resized||scheduler.xy.scale_height;
	scheduler._cols=[];	//store for data section, each column width
	scheduler._colsS={height:0}; // heights of the y sections
	this._trace_x =[]; // list of dates per cells

	var preserve = scheduler.config.preserve_scale_length;
	var dates = scheduler._timeline_x_dates.call(this, preserve);

	var summ = scheduler._x - this.dx - scheduler.xy.scroll_width; //border delta, whole width

	// calculate width for scrollable, define is autowidth needed or not
	if (this.scrollable && this.column_width > 0) {

		var summ_fixed = this.column_width * dates.displayed;

		if (summ_fixed > summ) {
			summ = summ_fixed;
			this._section_autowidth = false; // default === true
		}
	}

	var left = [this.dx]; // left margins, initial left margin
	var header = scheduler._els['dhx_cal_header'][0];
	header.style.width = (left[0]+summ)+'px';

	var start = scheduler._min_date_timeline = scheduler._min_date;


	var realcount = dates.displayed;
	var size = dates.total;

	// position calculation

	for (var k=0; k<size; k++){

		if (scheduler._ignores[k]){
			scheduler._cols[k]=0;
			realcount++;
		} else {
			scheduler._cols[k]=Math.floor(summ/(realcount-k));
		}

		summ -= scheduler._cols[k];
		left[k+1] = left[k] + scheduler._cols[k];
	}
	h.innerHTML = "<div></div>";

	if(this.second_scale){
		// additional calculations
		var mode = this.second_scale.x_unit;
		var control_dates = [this._trace_x[0]]; // first control date
		var second_cols = []; // each column width of the secondary row
		var second_left = [this.dx, this.dx]; // left margins of the secondary row
		var t_index = 0; // temp index
		for (var l = 0; l < this._trace_x.length; l++) {
			var date = this._trace_x[l];
			var res = scheduler._timeline_is_new_interval(mode, date, control_dates[t_index]);

			if(res) { // new interval
				++t_index; // starting new interval
				control_dates[t_index] = date; // updating control date as we moved to the new interval
				second_left[t_index+1] = second_left[t_index];
			}
			var t = t_index+1;
			second_cols[t_index] = scheduler._cols[l] + (second_cols[t_index]||0);
			second_left[t] += scheduler._cols[l];
		}

		h.innerHTML = "<div></div><div></div>";
		var top = h.firstChild;
		top.style.height = (original_sh)+'px'; // actually bottom header takes 21px
		var bottom = h.lastChild;
		bottom.style.position = "relative";
		bottom.className = "dhx_bottom_scale_container";
		for (var m = 0; m < control_dates.length; m++) {
			var tdate = control_dates[m];
			var scs = scheduler.templates[this.name+"_second_scalex_class"](tdate);
			var head=document.createElement("div"); head.className="dhx_scale_bar dhx_second_scale_bar"+((scs)?(" "+scs):"");
			scheduler.set_xy(head,second_cols[m]-1,original_sh-3,second_left[m],0); //-1 for border, -3 = -2 padding -1 border bottom
			head.innerHTML = scheduler.templates[this.name+"_second_scale_date"](tdate);
			top.appendChild(head);
		}
	}

	scheduler.xy.scale_height = original_sh; // fix for _render_x_header which uses current scale_height value
	h = h.lastChild; // h - original scale

	this._h_cols = {};

	for (var i=0; i<this._trace_x.length; i++){
		if (scheduler._ignores[i])
			continue;

		start = this._trace_x[i];
		scheduler._render_x_header(i, left[i], start, h);
		var cs = scheduler.templates[this.name+"_scalex_class"](start);
		if (cs)
			h.lastChild.className += " "+cs;

		h.lastChild.setAttribute('data-col-id', i);
		h.lastChild.setAttribute('data-col-date', timelineCellDateAttribute(start));

		// need to copy lastChild for IE11
		var clnLastChild = h.lastChild.cloneNode(true);

		// get cache of header all elements
		this._h_cols[i] = {div: clnLastChild, left: left[i]};
	}

	scheduler.xy.scale_height = current_sh; // restoring current value

	var trace = this._trace_x;
	h.onclick = function(e){
		var pos = scheduler._timeline_locate_hcell(e);
		if (pos)
			scheduler.callEvent("onXScaleClick",[pos.x, trace[pos.x], e||event]);
	};
	h.ondblclick = function(e){
		var pos = scheduler._timeline_locate_hcell(e);
		if (pos)
			scheduler.callEvent("onXScaleDblClick",[pos.x, trace[pos.x], e||event]);
	};
};

scheduler._timeline_is_new_interval = function is_new_interval(mode, date, control_date){ // mode, date to check, control_date for which period should be checked
	switch(mode) {
		case "hour":
			return ((date.getHours() != control_date.getHours()) || scheduler._timeline_is_new_interval("day", date, control_date));
		case "day":
			return !(date.getDate() == control_date.getDate() && date.getMonth() == control_date.getMonth() && date.getFullYear() == control_date.getFullYear());
		case "week":
			return !(scheduler.date.week_start(new Date(date)).valueOf() == scheduler.date.week_start(new Date(control_date)).valueOf());
			//return !(scheduler.date.getISOWeek(date) == scheduler.date.getISOWeek(control_date) && date.getFullYear() == control_date.getFullYear());
		case "month":
			return !(date.getMonth() == control_date.getMonth() && date.getFullYear() == control_date.getFullYear());
		case "year":
			return !(date.getFullYear() == control_date.getFullYear());
		default:
			return false; // same interval
	}
};

scheduler._timeline_reset_scale_height = function reset_scale_height(mode){
	if (this._header_resized && (!mode || !this.second_scale)) {
		scheduler.xy.scale_height /= 2;
		this._header_resized = false;
		var header = scheduler._els['dhx_cal_header'][0];
		header.className = header.className.replace(/ dhx_second_cal_header/gi,"");
	}
};

scheduler._timeline_set_full_view = function set_full_view(mode){
	scheduler._timeline_reset_scale_height.call(this, mode);

	if (mode){
		if (this.second_scale && !this._header_resized) {
			this._header_resized = scheduler.xy.scale_height;
			scheduler.xy.scale_height *= 2;
			scheduler._els['dhx_cal_header'][0].className += " dhx_second_cal_header";
		}

		scheduler.set_sizes();
		scheduler._init_matrix_tooltip();

		//we need to have day-rounded scales for navigation
		//in same time, during rendering scales may be shifted
		var temp = scheduler._min_date;
		scheduler._timeline_x_scale.call(this,scheduler._els["dhx_cal_header"][0]);

		// get header cells that are only in viewport
		if (scheduler.$container.querySelector('.dhx_timeline_scrollable_data')) {
			var viewPort  = scheduler._timeline_smart_render.getViewPort(this.scrollHelper);
			var curHeader = scheduler._timeline_smart_render.getVisibleHeader(this, viewPort);
			if (curHeader) {
				if (this.second_scale)
					scheduler._els.dhx_cal_header[0].children[1].innerHTML = curHeader;
				else
					scheduler._els.dhx_cal_header[0].children[0].innerHTML = curHeader;
			}
		}

		scheduler._timeline_y_scale.call(this,scheduler._els["dhx_cal_data"][0]);

		scheduler._min_date = temp;

		var dateElement = scheduler._getNavDateElement();
		if(dateElement){
			dateElement.innerHTML=scheduler.templates[this.name+"_date"](scheduler._min_date, scheduler._max_date);
		}

		if (scheduler._mark_now) {
			scheduler._mark_now();
		}
		scheduler._timeline_reset_scale_height.call(this, mode);

	}
	scheduler._timeline_render_scale_header(this, mode);
	// hide tooltip if it is displayed
	scheduler._timeline_hideToolTip();
};


scheduler._timeline_hideToolTip = function hideToolTip(){
	if (scheduler._tooltip){
		scheduler._tooltip.style.display = "none";
		scheduler._tooltip.date = "";
	}
};

scheduler._timeline_showToolTip = function showToolTip(obj,pos,offset){
	if (obj.render != "cell") return;
	var mark = pos.x+"_"+pos.y;
	var evs = obj._matrix[pos.y][pos.x];

	if (!evs) return scheduler._timeline_hideToolTip();

	evs.sort(function(a,b){ return a.start_date>b.start_date?1:-1; });

	if (scheduler._tooltip){
		if (scheduler._tooltip.date == mark) return;
		scheduler._tooltip.innerHTML="";
	} else {
		var t = scheduler._tooltip = document.createElement("div");
		t.className = "dhx_year_tooltip";
		if (scheduler.config.rtl) t.className += " dhx_tooltip_rtl";
		document.body.appendChild(t);
		t.onclick = scheduler._click.dhx_cal_data;
	}

	var html = "";

	for (var i=0; i<evs.length; i++){
		var bg_color = (evs[i].color?("background-color:"+evs[i].color+";"):"");
		var color = (evs[i].textColor?("color:"+evs[i].textColor+";"):"");
		html+="<div class='dhx_tooltip_line' event_id='"+evs[i].id+"' style='"+bg_color+""+color+"'>";
		html+="<div class='dhx_tooltip_date'>"+(evs[i]._timed?scheduler.templates.event_date(evs[i].start_date):"")+"</div>";
		html+="<div class='dhx_event_icon icon_details'>&nbsp;</div>";
		html+=scheduler.templates[obj.name+"_tooltip"](evs[i].start_date, evs[i].end_date,evs[i])+"</div>";
	}

	scheduler._tooltip.style.display="";
	scheduler._tooltip.style.top = "0px";

	if ((scheduler.config.rtl && offset.left-scheduler._tooltip.offsetWidth >= 0) || document.body.offsetWidth-pos.src.offsetWidth-offset.left-scheduler._tooltip.offsetWidth < 0) {
		scheduler._tooltip.style.left = offset.left-scheduler._tooltip.offsetWidth+"px";
	}
	else {
		scheduler._tooltip.style.left = offset.left+pos.src.offsetWidth+"px";
	}

	scheduler._tooltip.date = mark;
	scheduler._tooltip.innerHTML = html;

	if (document.body.offsetHeight-offset.top-scheduler._tooltip.offsetHeight < 0)
		scheduler._tooltip.style.top= offset.top-scheduler._tooltip.offsetHeight+pos.src.offsetHeight+"px";
	else
		scheduler._tooltip.style.top= offset.top+"px";
};

scheduler._matrix_tooltip_handler = function(e){
	var obj = scheduler.matrix[scheduler._mode];
	if (!obj || obj.render != "cell")
		return;
	if (obj){
		var pos = scheduler._locate_cell_timeline(e);
		var e = e || event;
		var src = e.target||e.srcElement;
		if (pos)
			return scheduler._timeline_showToolTip(obj,pos,scheduler.$domHelpers.getOffset(pos.src));
	}
	scheduler._timeline_hideToolTip();
};
scheduler._init_matrix_tooltip = function() {
	scheduler._detachDomEvent(scheduler._els["dhx_cal_data"][0], "mouseover", scheduler._matrix_tooltip_handler);
	scheduler.event(scheduler._els["dhx_cal_data"][0], "mouseover", scheduler._matrix_tooltip_handler);
};

scheduler._set_timeline_dates = function(view){
	scheduler._min_date = scheduler.date[view.name+"_start"](new Date(scheduler._date));
	scheduler._max_date = scheduler.date["add_" + view.name + "_private"](scheduler._min_date, view.x_size*view.x_step);

	if(scheduler.date[view.x_unit+"_start"]){
		scheduler._max_date = scheduler.date[view.x_unit+"_start"](scheduler._max_date);
	}
	scheduler._table_view = true;
};


scheduler._renderMatrix = function(mode, refresh) {
	if (!refresh)
		scheduler._els['dhx_cal_data'][0].scrollTop=0;



	scheduler._set_timeline_dates(this);

	scheduler._timeline_set_full_view.call(this,mode);
};

scheduler._timeline_html_index = function html_index(el) {
	var p = el.parentNode.childNodes;

	var nodeIndex = -1;
	for (var i=0; i < p.length; i++) {
		if (p[i] == el){
			nodeIndex = i;
			break;
		}
	}

	var resIndex = nodeIndex;
	if(scheduler._ignores_detected){
		for(var colIndex in scheduler._ignores){
			if(scheduler._ignores[colIndex] && colIndex*1 <= resIndex)
				resIndex++;
		}
	}

	return resIndex;
};

scheduler._timeline_locate_hcell = function locate_hcell(e){
	e = e||event;
	var trg = e.target?e.target:e.srcElement;
	while (trg && trg.tagName != "DIV")
		trg=trg.parentNode;
	if (trg && trg.tagName == "DIV"){
		var cs = scheduler._getClassName(trg).split(" ")[0];
		if (cs == "dhx_scale_bar")
			return { x:scheduler._timeline_html_index(trg), y:-1, src:trg, scale:true };
	}
};

function closest(element, selector){
	if(element.closest){
		return element.closest(selector);
	}else if(element.matches || element.msMatchesSelector || element.webkitMatchesSelector){
		var el = element;
		if (!document.documentElement.contains(el)) return null;
		do {
			var method = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;

			if (method.call(el, selector)) return el;
			el = el.parentElement || el.parentNode;
		} while (el !== null && el.nodeType === 1);
		return null;
	}else{
		window.console.error("Your browser is not supported");
		return null;
	}
}


scheduler._locate_cell_timeline = function(e){
	e = e||event;
	var trg = e.target?e.target:e.srcElement;

	var res = {};
	var view = scheduler.matrix[scheduler._mode];
	var pos = scheduler.getActionData(e);
	var ign = scheduler._ignores;

	var xNonIgnoredInd = 0;
	for (var xind = 0; xind < view._trace_x.length-1; xind++) {
		// | 8:00, 8:30 | 8:15 should be checked against 8:30
		// clicking at the most left part of the cell, say 8:30 should create event in that cell, not previous one
		if (+pos.date < view._trace_x[xind+1])
			break;

		if(!ign[xind]) {
			xNonIgnoredInd++;
		}
	}

	res.x = xNonIgnoredInd === 0 ? 0 : xind;
	res.y = view.order[pos.section];
	var diff = scheduler._isRender('cell') ? 1 : 0;

	// firstCellXind is needed for cell mode when part of cols is rendered only
	// and defines correct shift for tooltip xind = xind - firstCellXind
	// where xind = current index, firstCellXind = first visible cell index
	var firstCellXind = 0;
	if (view.scrollable && view.render === 'cell') {
		// define xind of first visible cell
		if (!view._scales[pos.section] || !view._scales[pos.section].querySelector('.dhx_matrix_cell')) return;
		var firstCell = view._scales[pos.section].querySelector('.dhx_matrix_cell');
			if (!firstCell) return;
		var fc_pos_x = firstCell.offsetLeft;
		if (fc_pos_x > 0) {
			var end_date = scheduler._timeline_drag_date(view, fc_pos_x);

			for (var i = 0; i < view._trace_x.length-1; i++) {
				if (+end_date < view._trace_x[i+1])
					break;
			}
			firstCellXind = i;
		}
	}
	res.src = view._scales[pos.section] ? view._scales[pos.section].querySelectorAll('.dhx_matrix_cell')[xind - firstCellXind] : null;

	var isScale = false;

	var scaleTarget = closest(trg, ".dhx_matrix_scell");
	if(scaleTarget){
		trg = scaleTarget;
		isScale = true;
	}

	if (isScale) { // Y scale
		res.x = -1;
		res.src = trg;
		res.scale = true;
	}
	else{
		res.x = xind;
	}

	return res;
};

var old_click = scheduler._click.dhx_cal_data;
scheduler._click.dhx_marked_timespan = scheduler._click.dhx_cal_data = function(e){
	var ret = old_click.apply(this,arguments);
	var obj = scheduler.matrix[scheduler._mode];
	if (obj){
		var pos = scheduler._locate_cell_timeline(e);
		if (pos){
			if (pos.scale)
				scheduler.callEvent("onYScaleClick",[pos.y, obj.y_unit[pos.y], e||event]);
			else {
				scheduler.callEvent("onCellClick", [pos.x, pos.y, obj._trace_x[pos.x], (((obj._matrix[pos.y] || {})[pos.x]) || []), e || event]);
				scheduler._timeline_set_scroll_pos(scheduler._els["dhx_cal_data"][0], obj);
			}
		}
	}
	return ret;
};

scheduler.dblclick_dhx_matrix_cell = function(e){
	var obj = scheduler.matrix[scheduler._mode];
	if (obj){
		var pos = scheduler._locate_cell_timeline(e);
		if (pos){
			if (pos.scale)
				scheduler.callEvent("onYScaleDblClick",[pos.y, obj.y_unit[pos.y], e||event]);
			else
				scheduler.callEvent("onCellDblClick",[pos.x, pos.y, obj._trace_x[pos.x], (((obj._matrix[pos.y]||{})[pos.x])||[]), e||event]);
		}
	}
};

var old_dblclick_marked_timespan = scheduler.dblclick_dhx_marked_timespan || function(){};
scheduler.dblclick_dhx_marked_timespan = function(e){
	var obj = scheduler.matrix[scheduler._mode];
	if (obj)
		return scheduler.dblclick_dhx_matrix_cell(e);
	else
		return old_dblclick_marked_timespan.apply(this,arguments);
};

scheduler.dblclick_dhx_matrix_scell = function(e){
	return scheduler.dblclick_dhx_matrix_cell(e);
};

scheduler._isRender = function(mode){
	return (scheduler.matrix[scheduler._mode] && scheduler.matrix[scheduler._mode].render == mode);
};

scheduler.attachEvent("onCellDblClick", function (x, y, a, b, event){
	if (this.config.readonly|| (event.type == "dblclick" && !this.config.dblclick_create)) return;

	var obj = scheduler.matrix[scheduler._mode];
	var event_options = {};
	event_options.start_date = obj._trace_x[x];
	event_options.end_date = (obj._trace_x[x+1]) ? obj._trace_x[x+1] : scheduler.date.add(obj._trace_x[x], obj.x_step, obj.x_unit);

	if (obj._start_correction)
		event_options.start_date = new Date(event_options.start_date*1 + obj._start_correction);
	if (obj._end_correction)
		event_options.end_date = new Date(event_options.end_date - obj._end_correction);

	event_options[obj.y_property] = obj.y_unit[y].key;
	scheduler.addEventNow(event_options, null, event);
});

scheduler.attachEvent("onBeforeDrag", function (event_id, mode, native_event_object){
	return !scheduler._isRender("cell");
});
scheduler.attachEvent("onEventChanged", function(id, ev) {
	ev._timed = this.isOneDayEvent(ev);
});
scheduler.attachEvent("onBeforeEventChanged", function (ev, e, flag, ev_old) {
	if(ev){
		ev._move_delta = undefined;
	}
	if(ev_old){
		ev_old._move_delta = undefined;
	}
	return true;
});

scheduler._is_column_visible = function(date){
	var mode = scheduler.matrix[scheduler._mode];
	var start_ind = scheduler._get_date_index(mode, date);
	return !scheduler._ignores[start_ind];
};
var old_render_marked_timespan = scheduler._render_marked_timespan;
scheduler._render_marked_timespan = function(options, area, unit_id, min_date, max_date) {
	if (!scheduler.config.display_marked_timespans)
		return [];

	if (scheduler.matrix && scheduler.matrix[scheduler._mode]) {
		if (scheduler._isRender('cell'))
			return;

		var view_opts = scheduler._lame_copy({}, scheduler.matrix[scheduler._mode]);
		//timespans must always use actual position, not rounded
		view_opts.round_position = false;
		var blocks = [];

		var units = [];
		var areas = [];
		var section = options.sections ? (options.sections.units || options.sections.timeline) : null;
		if (!unit_id) {  // should draw for every unit...
			var order = view_opts.order;
			if (section) { // ...or for only section if mentioned in configuration of timespan
				if (order.hasOwnProperty(section)) {
					units.push(section);
					areas.push(view_opts._scales[section]);
				}
			}else{
				if(view_opts._scales) {
					for (var key in order) {
						if (order.hasOwnProperty(key) && view_opts._scales[key]) {
							units.push(key);
							areas.push(view_opts._scales[key]);
						}
					}
				}
			}
		} else {
			areas = [area];
			units = [unit_id];
		}

		var min_date = min_date ? new Date(min_date) : scheduler._min_date;
		var max_date = max_date ? new Date(max_date) : scheduler._max_date;

		if(min_date.valueOf() < scheduler._min_date.valueOf())
			min_date = new Date(scheduler._min_date);
		if(max_date.valueOf() > scheduler._max_date.valueOf())
			max_date = new Date(scheduler._max_date);

		if(!view_opts._trace_x) return;

		for(var i = 0; i < view_opts._trace_x.length; i++){
			if(scheduler._is_column_visible(view_opts._trace_x[i]))
				break;
		}
		if(i == view_opts._trace_x.length)
			return;

		var dates = [];

		if (options.days > 6) {
			var specific_date = new Date(options.days);
			if (scheduler.date.date_part(new Date(min_date)) <= +specific_date && +max_date >= +specific_date)
				dates.push(specific_date);
		} else {
			dates.push.apply(dates, scheduler._get_dates_by_index(options.days));
		}

		var zones = options.zones;
		var css_classes = scheduler._get_css_classes_by_config(options);

		for (var j=0; j<units.length; j++) {
			area = areas[j];
			unit_id = units[j];

			for (var i=0; i<dates.length; i++) {
				var date = dates[i];
				for (var k=0; k<zones.length; k += 2) {
					var zone_start = zones[k];
					var zone_end = zones[k+1];
					var start_date = new Date(+date + zone_start*60*1000);
					var end_date = new Date(+date + zone_end*60*1000);

					start_date = new Date(start_date.valueOf() + (start_date.getTimezoneOffset() - date.getTimezoneOffset())*1000*60);

					end_date = new Date(end_date.valueOf() + (end_date.getTimezoneOffset() - date.getTimezoneOffset())*1000*60);

					if (!(min_date < end_date && max_date > start_date))
						continue;

					var block = scheduler._get_block_by_config(options);
					block.className = css_classes;

					var start_pos = scheduler._timeline_getX({start_date: start_date}, false, view_opts)-1;
					var end_pos = scheduler._timeline_getX({start_date: end_date}, false, view_opts)-1;
					var width = Math.max(1, end_pos - start_pos - 1);
					var height = ((view_opts._section_height[unit_id]-1) || (view_opts.dy - 1));

					block.style.cssText = "height: "+height+"px; " + (scheduler.config.rtl ? "right: " :"left: ")+start_pos+"px; width: "+width+"px; top: 0;";

					area.insertBefore(block, area.firstChild);
					blocks.push(block);
				}
			}
		}

		return blocks;

	} else {
			return old_render_marked_timespan.apply(scheduler, [options, area, unit_id]);
	}
};

var old_append_mark_now = scheduler._append_mark_now;
scheduler._append_mark_now = function(day_index, now) {
	if (scheduler.matrix && scheduler.matrix[scheduler._mode]) {
		var n_date = scheduler._currentDate();
		var zone_start = scheduler._get_zone_minutes(n_date);
		var options = {
			days: +scheduler.date.date_part(n_date),
			zones: [zone_start, zone_start+1],
			css: "dhx_matrix_now_time",
			type: "dhx_now_time"
		};
		return scheduler._render_marked_timespan(options);
	} else {
		return old_append_mark_now.apply(scheduler, [day_index, now]);
	}
};

var oldTimespans = scheduler._mark_timespans;
scheduler._mark_timespans = function(){
	if(scheduler.matrix && scheduler.matrix[scheduler.getState().mode]){
		var divs = [];

		var view = scheduler.matrix[scheduler.getState().mode];
		var options = view.y_unit;
		for(var i = 0; i < options.length; i++){
			var unit_key = options[i].key;
			var scale = view._scales[unit_key];

			var r = scheduler._on_scale_add_marker(scale, unit_key);
			divs.push.apply(divs, r);
		}

		return divs;
	}else{
		return oldTimespans.apply(this, arguments);
	}
};

var on_scale_marker_add = scheduler._on_scale_add_marker;
scheduler._on_scale_add_marker = function(scale, unit_key){

	if (scheduler.matrix && scheduler.matrix[scheduler._mode]) {
		var divs = [];
		var timespans = scheduler._marked_timespans;

		if (timespans && scheduler.matrix && scheduler.matrix[scheduler._mode]) {
			var mode = scheduler._mode;

			var min_date = scheduler._min_date;
			var max_date = scheduler._max_date;
			var global_data = timespans["global"];

			for (var t_date = scheduler.date.date_part(new Date(min_date)); t_date < max_date; t_date = scheduler.date.add(t_date, 1, "day")) {
				var day_value = +t_date;
				var day_index = t_date.getDay();
				var r_configs = [];

				var day_types = global_data[day_value]||global_data[day_index];
				r_configs.push.apply(r_configs, scheduler._get_configs_to_render(day_types));

				if (timespans[mode] && timespans[mode][unit_key]) {
					var z_config = [];
					var unit_types = scheduler._get_types_to_render(timespans[mode][unit_key][day_index], timespans[mode][unit_key][day_value]);
					z_config.push.apply(z_config, scheduler._get_configs_to_render(unit_types));
					if(z_config.length)
						r_configs = z_config;
				}

				for (var i=0; i<r_configs.length; i++) {
					var config = r_configs[i];
					var day = config.days;
					if (day < 7) {
						day = day_value;
						//specify min/max timespan dates, otherwise it can be rendered multiple times in some configurations
						divs.push.apply(divs, scheduler._render_marked_timespan(config, scale, unit_key, t_date, scheduler.date.add(t_date, 1, "day")));
						day = day_index;
					} else {
						divs.push.apply(divs, scheduler._render_marked_timespan(config, scale, unit_key, t_date, scheduler.date.add(t_date, 1, "day")));
					}
				}
			}
		}
		return divs;
	}else{
		return on_scale_marker_add.apply(this, arguments);
	}
};

scheduler._resolve_timeline_section = function(view, pos){
	var yind = 0;
	var summ = 0;
	for (yind; yind < this._colsS.heights.length; yind++) {
		summ += this._colsS.heights[yind];
		if (summ > pos.y)
			break;
	}

	if(!view.y_unit[yind]) {
		yind=view.y_unit.length-1;
	}
	if(this._drag_event && !this._drag_event._orig_section){
		this._drag_event._orig_section = view.y_unit[yind].key;
	}

	pos.fields = {};
	if (yind >= 0 && view.y_unit[yind]) {
		pos.section = pos.fields[view.y_property] = view.y_unit[yind].key;
	}
};
scheduler._update_timeline_section = function(action){
	var view = action.view,
		event = action.event,
		pos = action.pos;

	if (event) {
		if(event[view.y_property] != pos.section){
			var line_height = this._get_timeline_event_height(event, view);
			event._sorder = this._get_dnd_order(event._sorder, line_height, view._section_height[pos.section]);
		}
		event[view.y_property] = pos.section;
	}
};
scheduler._get_date_index=function(config, date) {
	var trace_x = config._trace_x;

	var searchFrom = 0,
		searchTo = trace_x.length - 1;

	// reduce search range with binary search
	var dateValue = date.valueOf();
	while(searchTo - searchFrom > 3){
		var middle = searchFrom + Math.floor((searchTo - searchFrom)/2);
		if(trace_x[middle].valueOf() > dateValue){
			searchTo = middle;
		}else{
			searchFrom = middle;
		}
	}

	var index = searchFrom;
	while (index <= searchTo && +date >= +trace_x[index+1]) {
		index++;
	}
	return index;
};

scheduler._timeline_drag_date = function(timeline, pos_x){
	var obj = timeline,
		pos = {x: pos_x};

	if(!obj._trace_x.length){
		return new Date(scheduler.getState().date);
	}

	var summ = 0, xind = 0;
	var ratio,
		column_width;
	for (xind; xind <= this._cols.length-1; xind++) {

		column_width = this._cols[xind];
		summ += column_width;
		if (summ>pos.x){ //index of section
			ratio = (pos.x-(summ-column_width))/column_width;
			ratio = (ratio < 0) ? 0 : ratio;
			break;
		}
	}

	if(obj.round_position){
		// in case of click, or creating new event, mouse position will be always rounded to start date of the cell
		// when dragging - position can be rounded to the start date of the next column, in order to improve the usability
		// edge = 1 - always return start date of current cell
		// 0.5 - round to next cell if mouse in the right half of cell
		var edge = 1;
		var mode = scheduler.getState().drag_mode;
		if(mode && mode != "move" && mode != "create"){
			edge = 0.5;//rounding for resize
		}
		if(ratio >= edge){
			xind++;
		}
		ratio = 0;
	}

	//border cases
	if (xind === 0 && this._ignores[0]) {
		xind = 1; ratio = 0;
		while (this._ignores[xind]) xind++;
	} else if ( xind == this._cols.length && this._ignores[xind-1]) {
		xind = this._cols.length-1; ratio = 0;
		while (this._ignores[xind]) xind--;
		xind++;
	}

	var end_date;
	// if our event is at the end of the view
	if(xind >= obj._trace_x.length) {
		end_date = scheduler.date.add(obj._trace_x[obj._trace_x.length-1], obj.x_step, obj.x_unit);
		if (obj._end_correction)
			end_date = new Date(end_date-obj._end_correction);
	} else {
		var timestamp_diff = ratio * column_width * obj._step + obj._start_correction;
		end_date = new Date(+obj._trace_x[xind]+timestamp_diff);
	}
	return end_date;
};

scheduler.attachEvent("onBeforeTodayDisplayed", function() {
	for(var i in scheduler.matrix){
		var obj = scheduler.matrix[i];
		obj.x_start = obj._original_x_start;
	}
	return true;
});

scheduler.attachEvent("onOptionsLoad",function(){
	for(var i in scheduler.matrix){
		var obj = scheduler.matrix[i];

		obj.order = {};
		scheduler.callEvent('onOptionsLoadStart', []);
		for(var i=0; i<obj.y_unit.length;i++)
			obj.order[obj.y_unit[i].key]=i;
		scheduler.callEvent('onOptionsLoadFinal', []);
		if (scheduler._date && obj.name == scheduler._mode) {
			obj._options_changed = true;
			scheduler.setCurrentView(scheduler._date, scheduler._mode);
			setTimeout(function () {
				obj._options_changed = false;
			});
		}
	}
});

scheduler.attachEvent("onEventIdChange", function(){
	var view = scheduler.getView();
	if(view && scheduler.matrix[view.name]){
		if(scheduler._timeline_smart_render){

			scheduler._timeline_smart_render.clearPreparedEventsCache();
			scheduler._timeline_smart_render.getPreparedEvents(view);
		}
	}

});

scheduler.attachEvent("onBeforeDrag",function(id, drag_mode, e){
	if(drag_mode == 'resize'){
		var trg = e.target || e.srcElement;
		var className = scheduler._getClassName(trg);
		if(className.indexOf("dhx_event_resize_end") < 0){
			scheduler._drag_from_start = true;
		}else{
			scheduler._drag_from_start = false;
		}
	}

	return true;
});

/* autoscroll start */

var scrollInterval = 10;

var interval = null,
	startPos = null;

function getRelativeCoordinates (e, parent) {
	var view = scheduler.matrix[scheduler._mode];
	var pos = {},
		offset = {},
		container = parent;

	pos.x = !!e.touches ? e.touches[ 0 ].pageX : e.pageX;
	pos.y = !! e.touches ? e.touches[ 0 ].pageY : e.pageY;

	offset.left = container.offsetLeft + view.dx;
	offset.top = container.offsetTop;

	while ( container ) {

		offset.left += container.offsetLeft;
		offset.top += container.offsetTop;

		container = container.offsetParent;
	}

	return {
		x : pos.x - offset.left,
		y : pos.y - offset.top
	};
}

function autoscrollInterval(event){
	if(interval)
		clearInterval(interval);

	scheduler._schedulerOuter =  scheduler.$container.querySelector(".dhx_timeline_data_wrapper");

	var eventPos = {
		pageX: !!event.touches ? event.touches[0].pageX : event.pageX,
		pageY: !!event.touches ? event.touches[0].pageY : event.pageY
	};
	interval = setInterval(function(){tick(eventPos);}, scrollInterval);
}

function tick(e){
	if(!scheduler.getState().drag_id) {
		clearInterval(interval);
		startPos = null;
		return;
	}

	var view = scheduler.matrix[scheduler._mode];
	if(!view)
		return;

	var viewport = scheduler._schedulerOuter;
	var box = getRelativeCoordinates(e, viewport);

	var availWidth = viewport.offsetWidth - view.dx;
	var availHeight = viewport.offsetHeight;

	var posX = box.x;
	var posY = box.y;

	var settings = view.autoscroll || {};

	scheduler._merge(settings, {
		range_x: 200,// px to edge
		range_y: 100,
		speed_x: 20,// speed
		speed_y: 10
	});

	var scrollLeft = need_scroll(posX, availWidth, startPos ? startPos.x : 0, settings.range_x);
	if(!view.scrollable){
		scrollLeft = 0;
	}
	var scrollTop = need_scroll(posY, availHeight, startPos ? startPos.y : 0, settings.range_y);

	if((scrollTop || scrollLeft) && !startPos){
		startPos = {
			x: posX,
			y: posY
		};

		scrollLeft = 0;
		scrollTop = 0;
	}

	scrollLeft = scrollLeft * settings.speed_x;
	scrollTop = scrollTop * settings.speed_y;

	if(scrollLeft && scrollTop){
		if(Math.abs(scrollLeft / 5) > Math.abs(scrollTop)){
			scrollTop = 0;
		}else if(Math.abs(scrollTop / 5) > Math.abs(scrollLeft)){
			scrollLeft = 0;
		}
	}

	if(scrollLeft || scrollTop){
		startPos.started = true;
		scroll(scrollLeft, scrollTop);
	}else{
		clearInterval(interval);
	}
}

function need_scroll(pos, boxSize, startCoord, scrollRange){
	if(pos < scrollRange && (!startPos || startPos.started || pos < startCoord)){
		return -1;
	}else if(boxSize - pos < scrollRange && (!startPos || startPos.started || pos > startCoord)){
		return 1;
	}
	return 0;
}

function scroll(left, top){
	var viewport = scheduler._schedulerOuter;
	if(top){
		viewport.scrollTop += top;
	}
	if (left){ // + 40 - adjust height of that movement was correct
		viewport.scrollLeft += left;
	}
}


var evId = scheduler.attachEvent("onSchedulerReady", function(){
	if (scheduler.matrix) {
		scheduler.event(document.body, "mousemove", autoscrollInterval);
		scheduler.detachEvent(evId);
	}
});

/* autoscroll end */
/* timeline smart render */

// scrollable should be = true
// horizontal and vertical scroll -> dhx_timeline_scrollable_data

scheduler._timeline_smart_render = {
	_prepared_events_cache: null,
	_rendered_events_cache: [],
	_rendered_header_cache: [],
	_rendered_labels_cache: [],
	_rows_to_delete: [],
	_rows_to_add: [],
	_cols_to_delete: [],
	_cols_to_add: [],

	getViewPort: function(scrollHelper, resizeHeight, scrollLeft, scrollTop){
		// top/left/height/width of viewport with scroll pos
		var scrollBlock = scheduler.$container.querySelector(".dhx_cal_data");
		var coords = scrollBlock.getBoundingClientRect();

		var scrollableContainer = scheduler.$container.querySelector(".dhx_timeline_scrollable_data");
		if(scrollableContainer && scrollLeft === undefined){
			scrollLeft = scrollHelper.getScrollValue(scrollableContainer);
		}
		if(scrollTop === undefined){
			if(scrollableContainer){
				scrollTop = scrollableContainer.scrollTop;
			}else{
				scrollTop = scrollBlock.scrollTop;
			}
		}

		var copy = {};
		for(var i in coords){
			copy[i] = coords[i];
		}

		copy.scrollLeft = scrollLeft || 0;
		copy.scrollTop = scrollTop || 0;
		if (resizeHeight)
			coords.height = resizeHeight;

		return copy;
	},
	isInXViewPort: function (item, viewPort) {
		var viewPortLeft =  viewPort.scrollLeft;
		var viewPortRight = viewPort.width + viewPort.scrollLeft;

		// return true/false for item in/not in viewport on X axis
		return (item.left < viewPortRight + 100 && item.right > viewPortLeft - 100); // +100 and -100 spreads viewport width
	},
	isInYViewPort: function (item, viewPort) {
		var viewPortTop =  viewPort.scrollTop;
		var viewPortBottom = viewPort.height + viewPort.scrollTop;

		// return true/false for item in/not in viewport on Y axis
		return (item.top < (viewPortBottom + 100) && item.bottom > viewPortTop - 100); // +100 and -100 spreads viewport height
	},

	getVisibleHeader: function(view, viewPort) {
		var curHeader = '';
		this._rendered_header_cache = [];

		for (var i in view._h_cols) {
			var col = view._h_cols[i];
			if (this.isInXViewPort({left: col.left, right: col.left + scheduler._cols[i]}, viewPort)) {
				var html = col.div.outerHTML;
				curHeader += html;

				this._rendered_header_cache.push(col.div.getAttribute("data-col-id"));
			}
		}

		return curHeader;
	},

	updateHeader: function(view, viewPort, parent) {
		this._cols_to_delete = [];
		this._cols_to_add = [];

		var headers = scheduler.$container.querySelectorAll(".dhx_cal_header > div");
		var cells = headers[headers.length - 1].querySelectorAll(".dhx_scale_bar");// take cells of bottom scale

		var visibleItems = [];
		for(var i = 0; i < cells.length; i++){
			visibleItems.push(cells[i].getAttribute("data-col-id"));
		}

		// find new elements
		var res = this.getVisibleHeader(view, viewPort);
		if (!res)
			return;

		var renderers = this._rendered_header_cache.slice();
		var itemsToDel = [];

		for (var i = 0, len = visibleItems.length; i < len; i++) {
			var pos = renderers.indexOf(visibleItems[i]);
			if ( pos > -1) {
				renderers.splice(pos, 1);
			} else {
				itemsToDel.push(visibleItems[i]);
			}
		}

		if (itemsToDel.length) {
			this._cols_to_delete = itemsToDel.slice();
			this._deleteHeaderCells(itemsToDel, view, parent);
		}
		if (renderers.length)  {
			this._cols_to_add = renderers.slice();
			this._addHeaderCells(renderers, view, parent);
		}
	},

	_deleteHeaderCells: function(items, view, parent) {
		for (var i = 0; i < items.length; i++) {
			var item = parent.querySelector('[data-col-id="'+items[i]+'"]');
			if(item){
				parent.removeChild(item);
			}
		}
	},

	_addHeaderCells: function(items, view, parent) {
		var html = '';
		for (var i = 0; i < items.length; i++) {
			html += view._h_cols[items[i]].div.outerHTML;
		}

		parent.insertAdjacentHTML('beforeEnd', html);
	},

	getVisibleLabels: function(view, viewPort) {
		if (!view._label_rows.length) return;

		var curLabelCol = '';

		this._rendered_labels_cache = [];
		for (var i = 0; i < view._label_rows.length; i++) {
			if (this.isInYViewPort({top: view._label_rows[i].top, bottom: view._label_rows[i].top + view._section_height[view.y_unit[i].key]}, viewPort)) {
				var html = view._label_rows[i].div;
				curLabelCol += html;

				this._rendered_labels_cache.push(i);
			}
		}

		return curLabelCol;
	},

	updateLabels: function(view, viewPort, parent) {
		this._rows_to_delete = [];
		this._rows_to_add = [];

		var visibleItems = this._rendered_labels_cache.slice();

		// is it realy no visible items? check it again
		if (!visibleItems.length) {
			this.getVisibleLabels(view, viewPort);
			visibleItems = this._rendered_labels_cache.slice();
		}

		// find new elements
		var res = this.getVisibleLabels(view, viewPort);
		if (!res)
			return;

		var renderers = this._rendered_labels_cache.slice();

		var itemsToDel = [];

		for (var i = 0, len = visibleItems.length; i < len; i++) {
			var pos = renderers.indexOf(visibleItems[i]);
			if ( pos > -1) {
				renderers.splice(pos, 1);
			} else {
				itemsToDel.push(visibleItems[i]);
			}
		}

		if (itemsToDel.length) {
			this._rows_to_delete = itemsToDel.slice();
			this._deleteLabelCells(itemsToDel, view, parent);
		}
		if (renderers.length) {
			this._rows_to_add = renderers.slice();
			this._addLabelCells(renderers, view, parent);
		}
	},

	_deleteLabelCells: function(items, view, parent) {
		for (var i = 0; i < items.length; i++) {
			var item = parent.querySelector('[data-row-index="'+items[i]+'"]');
			if(item){
				parent.removeChild(item);
			}
		}
	},

	_addLabelCells: function(items, view, parent) {
		var html = '';
		for (var i = 0; i < items.length; i++) {
			html += view._label_rows[items[i]].div;
		}

		parent.insertAdjacentHTML('beforeEnd', html);
	},

	clearPreparedEventsCache: function () {
		this.cachePreparedEvents(null);
	},
	cachePreparedEvents: function(events){
		this._prepared_events_cache = events;
		this._prepared_events_coordinate_cache = events;

	},

	getPreparedEvents: function(view){
		var evs;
		if(this._prepared_events_cache){
			evs = this._prepared_events_cache;
		}else{
			evs = scheduler._prepare_timeline_events(view);
			evs.$coordinates = {};
			this.cachePreparedEvents(evs);




			//var x_start = scheduler._timeline_getX(evs[i][m], false, view);
			//		var x_end = scheduler._timeline_getX(evs[i][m], true, view);
		}
		return evs;
	},

	updateEvents: function(view, viewPort) {
		var evs = this.getPreparedEvents(view);

		var visibleEvents = this._rendered_events_cache.slice();
		this._rendered_events_cache = [];

		var grid = scheduler.$container.querySelector('.dhx_cal_data .dhx_timeline_data_col');
		if (!grid) return;

		for (var i = 0; i < this._rendered_labels_cache.length; i++) {
			var row = this._rendered_labels_cache[i];
			var eventsToAdd = [];

			var visibleRowEvents = visibleEvents[row] ? visibleEvents[row].slice() : [];
			scheduler._timeline_calculate_event_positions.call(view, evs[row]);
			var renderers = scheduler._timeline_smart_render.getVisibleEventsForRow(view, viewPort, evs, row);

			for (var item = 0, lenRend = renderers.length; item < lenRend; item++) {
				var pos = visibleRowEvents.indexOf(renderers[item].id);
				if ( pos > -1) {
					visibleRowEvents.splice(pos, 1);
				} else {
					eventsToAdd.push(renderers[item]);
				}
			}

			var line = grid.querySelector('[data-section-index="'+ row +'"]');

			if (visibleRowEvents.length) {
				this._deleteEvents(visibleRowEvents, view, line);
			}
			if (eventsToAdd.length) {
				this._addEvents(eventsToAdd, view, line, row);
			}
		}
		scheduler._populate_timeline_rendered(scheduler.$container);
		view._matrix = evs;
	},

	_deleteEvents: function(events, view, parent) {
		for (var i = 0; i < events.length; i++) {
			var event = parent.querySelector('[event_id="'+ events[i] +'"]');
			if (event) {
				if (!event.classList.contains('dhx_in_move'))
					parent.removeChild(event);
			}
		}
	},

	_addEvents: function(events, view, parent, i) {
		// calculate height of all events but will render below only events in viewport
		var events_html = scheduler._timeline_update_events_html.call(view, events);
		parent.insertAdjacentHTML('beforeEnd', events_html);
	},

	getVisibleEventsForRow: function(view, viewPort, evs, rowIndex) {
		// get events only for viewport
		var evsInViewport = [];
		if (view.render == "cell") {
			evsInViewport = evs;
		} else {
			var rowEvents = evs[rowIndex];
			if (rowEvents) {
				for (var m = 0, evLen = rowEvents.length; m < evLen; m++) {
					var event = rowEvents[m];
					var coordinateCacheKey = rowIndex + '_' + event.id;
					var xStart, xEnd;
					if (evs.$coordinates && evs.$coordinates[coordinateCacheKey]) {
						xStart = evs.$coordinates[coordinateCacheKey].xStart;
						xEnd = evs.$coordinates[coordinateCacheKey].xEnd;
					} else {
						xStart = scheduler._timeline_getX(event, false, view);
						xEnd = scheduler._timeline_getX(event, true, view);

						if (evs.$coordinates) {
							evs.$coordinates[coordinateCacheKey] = {
								xStart: xStart,
								xEnd: xEnd
							};
						}
					}

					if (scheduler._timeline_smart_render.isInXViewPort({left: xStart, right: xEnd}, viewPort)) {
						evsInViewport.push(event);

						// save to cache
						if (!this._rendered_events_cache[rowIndex])
							this._rendered_events_cache[rowIndex] = [];
						this._rendered_events_cache[rowIndex].push(event.id);
					}
				}
			}
		}

		return evsInViewport;
	},

	getVisibleRowCellsHTML: function(view, viewPort, stats, evs, i) {
		// full render for new row uses _rendered_header_cache
		// that contains currently visible cols
		var dataWrapper = '';
		var cellLeftPos;

		var visibleColumns = this._rendered_header_cache;

		for (var ind = 0; ind < visibleColumns.length; ind++) {
			var j = visibleColumns[ind];

			cellLeftPos = view._h_cols[j].left - view.dx;

			if (scheduler._ignores[j]){

				if (view.render == "cell"){
					dataWrapper += scheduler._timeline_get_html_for_cell_ignores(stats);
				}else{
					dataWrapper += scheduler._timeline_get_html_for_bar_ignores();
				}
			}else {
				if (view.render == "cell"){
					dataWrapper += scheduler._timeline_get_html_for_cell(j, i, view, evs[i][j], stats, cellLeftPos);
				}else{
					dataWrapper += scheduler._timeline_get_html_for_bar(j, i, view, evs[i], cellLeftPos);
				}
			}
		}

		return dataWrapper;
	},

	getVisibleTimelineRowsHTML: function(view, viewPort, evs, rowIndex) {
		var dataWrapper = '';
		var stats = scheduler._timeline_get_cur_row_stats(view, rowIndex);
		stats = scheduler._timeline_get_fit_events_stats(view, rowIndex, stats);

		var cachedRow = view._label_rows[rowIndex];

		var template = scheduler.templates[view.name + "_row_class"];
		var templateParams = { view: view, section: cachedRow.section, template: template};
		// check vertical direction
		if (view.render == "cell") {
			dataWrapper += scheduler._timeline_get_html_for_cell_data_row(rowIndex, stats, cachedRow.top, cachedRow.section.key, templateParams);
			dataWrapper += this.getVisibleRowCellsHTML(view, viewPort, stats, evs, rowIndex);
			dataWrapper += '</div>';
		} else {
			//section 2
			dataWrapper += scheduler._timeline_get_html_for_bar_matrix_line(rowIndex, stats, cachedRow.top, cachedRow.section.key, templateParams);

			// section 3
			dataWrapper += scheduler._timeline_get_html_for_bar_data_row(stats, templateParams);
			dataWrapper += this.getVisibleRowCellsHTML(view, viewPort, stats, evs, rowIndex);
			dataWrapper += "</div></div>";
		}

		return dataWrapper;
	},

	updateGridRows: function(view, viewPort) {
		if (this._rows_to_delete.length) {
			this._deleteGridRows(this._rows_to_delete);
		}
		if (this._rows_to_add.length) {
			this._addGridRows(this._rows_to_add, view, viewPort);
		}
	},

	_deleteGridRows: function(items) {
		var parent = scheduler.$container.querySelector('.dhx_cal_data .dhx_timeline_data_col');
		if (!parent) return;

		for (var i = 0; i < items.length; i++) {
			var item = parent.querySelector('[data-section-index="'+(items[i])+'"]');
			parent.removeChild(item);
		}

		this._rows_to_delete = [];
	},

	_addGridRows: function(items, view, viewPort) {
		var parent = scheduler.$container.querySelector('.dhx_cal_data .dhx_timeline_data_col');
		if (!parent) return;

		var evs = this.getPreparedEvents(view);

		var html = '';
		var addedRows = [];
		for (var i = 0; i < items.length; i++) {
			html += this.getVisibleTimelineRowsHTML(view, viewPort, evs, items[i]);

		}

		parent.insertAdjacentHTML('beforeEnd', html);

		for (var i = 0; i < items.length; i++) {
			scheduler._timeline_finalize_section_add(view, view.y_unit[items[i]].key, parent);
		}
		if (scheduler._mark_now) {
			scheduler._mark_now();
		}
		this._rows_to_add = [];
	},

	updateGridCols: function(view, viewPort) {
		var visibleHeaderColumns = this._rendered_header_cache;

		var renderedTimelineColumnsHash = {};
		var visibleHeaderColumnsHash = {};
		for(var i = 0; i < visibleHeaderColumns.length; i++){
			visibleHeaderColumnsHash[visibleHeaderColumns[i]] = true;
		}

		var anyRow = scheduler.$container.querySelector(".dhx_timeline_data_row");
		if(anyRow){
			var columns = anyRow.querySelectorAll("[data-col-id]");
			for(var i = 0; i < columns.length; i++){
				renderedTimelineColumnsHash[columns[i].getAttribute("data-col-id")] = true;
			}
		}

		var shouldDelete = [],
			shouldRender = [];

		for(var i in renderedTimelineColumnsHash){
			if(!visibleHeaderColumnsHash[i]){
				shouldDelete.push(i);
			}
		}
		for(var i in visibleHeaderColumnsHash){
			if(!renderedTimelineColumnsHash[i]){
				shouldRender.push(i);
			}
		}

		if (shouldDelete.length) {
			this._deleteGridCols(shouldDelete, view);
		}
		if (shouldRender.length) {
			this._addGridCols(shouldRender, view, viewPort);
		}
	},

	_deleteGridCols: function(items, view) {
		var grid = scheduler.$container.querySelector('.dhx_cal_data .dhx_timeline_data_col');
		if (!grid) return;

		for (var r = 0; r < this._rendered_labels_cache.length; r++) {
			var parent;

			if (view.render == 'cell') {
				parent = grid.querySelector('[data-section-index="'+(this._rendered_labels_cache[r])+'"]');
			} else {
				parent = grid.querySelector('[data-section-index="'+(this._rendered_labels_cache[r])+'"] .dhx_timeline_data_row ');
			}

			if (parent) {
				for (var i = 0; i < items.length; i++) {
					var item = parent.querySelector('[data-col-id="'+items[i]+'"]');
					if (item)
						parent.removeChild(item);
				}
			}
		}

		this._cols_to_delete = [];
	},

	_addGridCols: function(items, view, viewPort) {
		var grid = scheduler.$container.querySelector('.dhx_cal_data .dhx_timeline_data_col');
		if (!grid) return;

		var evs = this.getPreparedEvents(view);

		for (var r = 0; r < this._rendered_labels_cache.length; r++) {
			var i = this._rendered_labels_cache[r];
			var html = '';
			var stats = scheduler._timeline_get_cur_row_stats(view, i);
			stats = scheduler._timeline_get_fit_events_stats(view, i, stats);

			var parent;

			if (view.render == 'cell') {
				parent = grid.querySelector('[data-section-index="'+ i +'"]');
			} else {
				parent = grid.querySelector('[data-section-index="'+ i +'"] .dhx_timeline_data_row');
			}

			if (parent) {
				for (var j = 0; j < items.length; j++) {
					var item = parent.querySelector('[data-col-id="'+items[j]+'"]');

					if (!item) {
						var cell = this.getVisibleGridCell(view, viewPort, stats, evs, i, items[j]);
						if (cell)
							html += cell;
					}
				}

				parent.insertAdjacentHTML('beforeEnd', html);
			}
		}

		this._cols_to_add = [];
	},

	getVisibleGridCell: function(view, viewPort, stats, evs, i, cellIndex) {
		if (!view._h_cols[cellIndex]) return;
		var dataWrapper = '';
		var cellLeftPos = view._h_cols[cellIndex].left-view.dx;

		if (view.render == "cell") {
			if (scheduler._ignores[cellIndex]){
				//dataWrapper += scheduler._timeline_get_html_for_cell_ignores(stats);
			}else {
				dataWrapper += scheduler._timeline_get_html_for_cell(cellIndex, i, view, evs[i][cellIndex], stats, cellLeftPos);
			}
		} else {
			if (scheduler._ignores[cellIndex]){
				//dataWrapper += scheduler._timeline_get_html_for_bar_ignores();
			}else {
				dataWrapper += scheduler._timeline_get_html_for_bar(cellIndex, i, view, evs[i], cellLeftPos);
			}
		}

		return dataWrapper;
	}
};

/* timeline smart render end */


};
scheduler._temp_matrix_scope();


});
