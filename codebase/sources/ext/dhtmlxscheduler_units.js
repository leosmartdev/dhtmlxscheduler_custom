/*
@license
dhtmlxScheduler v.4.4.9 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(scheduler){

scheduler._props = {};
scheduler.createUnitsView=function(name,property,list,size,step,skip_incorrect, days){
	if (typeof name == "object"){
		list = name.list;
		property = name.property;
		size = name.size||0;
		step = name.step||1;
		skip_incorrect = name.skip_incorrect;
		days = name.days || 1;
		name = name.name;
	}

	scheduler._props[name]={map_to:property, options:list, step:step, position:0, days: days };
    if(size>scheduler._props[name].options.length){
        scheduler._props[name]._original_size = size;
        size = 0;
    }
    scheduler._props[name].size = size;
	scheduler._props[name].skip_incorrect = skip_incorrect||false;

	scheduler.date[name+"_start"]= scheduler.date.day_start;
	scheduler.templates[name+"_date"] = function(date, end_date){
		var pr = scheduler._props[name];
		if(!(pr.days > 1)){
			return scheduler.templates.day_date(date);
		}else{
			return scheduler.templates.week_date(date, end_date);
		}
	};

	scheduler._get_unit_index = function(unit_view, date) {
		var original_position = unit_view.position || 0;
		var date_position = Math.round((scheduler._correct_shift(+date, 1) - +scheduler._min_date) / (60 * 60 * 24 * 1000));

		var l = unit_view.options.length;
		if(date_position >= l) {
			date_position = date_position % l;
		}

		return original_position + date_position;
	};
	scheduler.templates[name + "_scale_text"] = function(id, label, option) {
		if (option.css) {
			return "<span class='" + option.css + "'>" + label + "</span>";
		} else {
			return label;
		}
	};
	scheduler.templates[name+"_scale_date"] = function(date) {
		var unit_view = scheduler._props[name];
		var list = unit_view.options;
		if (!list.length) return "";
		var index = scheduler._get_unit_index(unit_view, date);
		var option = list[index];
		return scheduler.templates[name + "_scale_text"](option.key, option.label, option);
	};
	scheduler.templates[name+"_second_scale_date"] = function(date) {
		return scheduler.templates.week_scale_date(date);
	};

	scheduler.date["add_"+name]=function(date,inc){
		return scheduler.date.add(date,inc * scheduler._props[name].days,"day");
	};
	scheduler.date["get_"+name+"_end"]=function(date){
		return scheduler.date.add(date,(scheduler._props[name].size||scheduler._props[name].options.length)*scheduler._props[name].days,"day");
	};

	scheduler.attachEvent("onOptionsLoad",function(){
        var pr = scheduler._props[name];
		var order = pr.order = {};
		var list = pr.options;
		for(var i=0; i<list.length;i++)
			order[list[i].key]=i;
        if(pr._original_size && pr.size===0){
            pr.size = pr._original_size;
            delete pr.original_size;
        }
		if(pr.size > list.length) {
            pr._original_size = pr.size;
            pr.size = 0;
        }
        else
            pr.size = pr._original_size||pr.size;
		if (scheduler._date && scheduler._mode == name)
			scheduler.setCurrentView(scheduler._date, scheduler._mode);
	});

	scheduler["mouse_"+ name] = function(pos){ //mouse_coord handler
		var pr = scheduler._props[this._mode];

		if (pr){
			pos = this._week_indexes_from_pos(pos);
			if(!this._drag_event) this._drag_event = {};

			if (this._drag_id && this._drag_mode){
				this._drag_event._dhx_changed = true;
			}


			if(this._drag_mode && this._drag_mode == "new-size"){
				var sday = scheduler._get_event_sday(scheduler._events[scheduler._drag_id]);
				if(Math.floor(pos.x / pr.options.length) != Math.floor(sday / pr.options.length))
					pos.x = sday;
			}

			var section_ind = pos.x % pr.options.length;
			var unit_ind = Math.min(section_ind+pr.position,pr.options.length-1);

			pos.section = (pr.options[unit_ind]||{}).key;
			pos.x = Math.floor(pos.x / pr.options.length);




			var ev = this.getEvent(this._drag_id);
			this._update_unit_section({view:pr, event:ev, pos:pos});
		}
		pos.force_redraw = true;

		return pos;
	};



	scheduler.callEvent("onOptionsLoad",[]);
};

scheduler._update_unit_section = function(action){
	var view = action.view,
		event = action.event,
		pos = action.pos;
	if(event) {
		event[view.map_to] = pos.section;
	}
};

scheduler.scrollUnit=function(step){
	var pr = scheduler._props[this._mode];
	if (pr){
		pr.position=Math.min(Math.max(0,pr.position+step),pr.options.length-pr.size);
		this.setCurrentView();
	}
};
(function(){
	var _removeIncorrectEvents = function(evs) {
		var pr = scheduler._props[scheduler._mode];
		if(pr && pr.order && pr.skip_incorrect) {
            var correct_events = [];
			for(var i=0; i<evs.length; i++) {
				if(typeof pr.order[evs[i][pr.map_to]] != "undefined") {
                    correct_events.push(evs[i]);
				}
			}
            evs.splice(0,evs.length);
			evs.push.apply(evs,correct_events);
		}
		return evs;
	};
	var old_pre_render_events_table = scheduler._pre_render_events_table;
	scheduler._pre_render_events_table=function(evs,hold) {
		evs = _removeIncorrectEvents(evs);
		return old_pre_render_events_table.apply(this, [evs, hold]);
	};
	var old_pre_render_events_line = scheduler._pre_render_events_line;
	scheduler._pre_render_events_line = function(evs,hold){
		evs = _removeIncorrectEvents(evs);
		return old_pre_render_events_line.apply(this, [evs, hold]);
	};
	var fix_und=function(pr,ev){
		if (pr && typeof pr.order[ev[pr.map_to]] == "undefined"){
			var s = scheduler;
			var dx = 24*60*60*1000;
			var ind = Math.floor((ev.end_date - s._min_date)/dx);
			//ev.end_date = new Date(s.date.time_part(ev.end_date)*1000+s._min_date.valueOf());
			//ev.start_date = new Date(s.date.time_part(ev.start_date)*1000+s._min_date.valueOf());

			if(pr.options.length)
				ev[pr.map_to] = pr.options[Math.min(ind+pr.position,pr.options.length-1)].key;
			return true;
		}
	};


	var oldive = scheduler.is_visible_events;
	scheduler.is_visible_events = function(e){
		var res = oldive.apply(this,arguments);
		if (res){
			var pr = scheduler._props[this._mode];
			if (pr && pr.size){
				var val = pr.order[e[pr.map_to]];
				if (val < pr.position || val >= pr.size+pr.position )
					return false;
			}
		}
		return res;
	};

	var old_process_ignores = scheduler._process_ignores;

	scheduler._process_ignores = function(sd, n, mode, step, preserve){
		if(!scheduler._props[this._mode]){
			old_process_ignores.call(this, sd, n, mode, step, preserve);
			return;
		}
		this._ignores={};
		this._ignores_detected = 0;
		var ignore = scheduler["ignore_"+this._mode];

		if (ignore){
			var sectionsCount = (scheduler._props && scheduler._props[this._mode] ?
				(scheduler._props[this._mode].size||scheduler._props[this._mode].options.length) : 1);
			n /= sectionsCount;

			var ign_date = new Date(sd);
			for (var i=0; i<n; i++){
				if (ignore(ign_date)){
					var sectionStart = i * sectionsCount,
						sectionEnd = (i + 1) * sectionsCount;

					for(var j = sectionStart; j < sectionEnd; j++) {
						this._ignores_detected += 1;
						this._ignores[j] = true;
						if (preserve)
							n++;
					}
				}
				ign_date = scheduler.date.add(ign_date, step, mode);
				if(scheduler.date[mode + '_start'])
					ign_date = scheduler.date[mode + '_start'](ign_date);
			}
		}
	};


	var t = scheduler._reset_scale;
	scheduler._reset_scale = function(){
		var pr = scheduler._props[this._mode];
		var ret = t.apply(this,arguments);
		if (pr){

			this._max_date = this.date.add(this._min_date,pr.days,"day");

			var d = this._els["dhx_cal_data"][0].childNodes;
			for (var i=0; i < d.length; i++)
				d[i].className = d[i].className.replace("_now",""); //clear now class

			// set background for current date
			var today = this._currentDate();
			if(today.valueOf() >= this._min_date && today.valueOf() < this._max_date) {
				var dx = 24*60*60*1000;
				var ind = Math.floor((today - scheduler._min_date)/dx);
				var units_l = pr.options.length;
				var today_start = ind*units_l;
				var today_end = today_start + units_l;
				for (i=today_start; i<today_end; i++){
					if(d[i])
						d[i].className = d[i].className.replace("dhx_scale_holder","dhx_scale_holder_now"); //set now class
				}
			}

			if (pr.size && pr.size < pr.options.length){

				var h = this._els["dhx_cal_header"][0];
				var arrow = document.createElement("DIV");
				if (pr.position){

					this._waiAria.headerButtonsAttributes(arrow, "");

					arrow.className = "dhx_cal_prev_button";
					arrow.style.cssText="left:1px;top:2px;position:absolute;";
					arrow.innerHTML = "&nbsp;";
					h.firstChild.appendChild(arrow);
					arrow.onclick=function(){
						scheduler.scrollUnit(pr.step*-1);
					};
				}
				if (pr.position+pr.size<pr.options.length){
					this._waiAria.headerButtonsAttributes(arrow, "");

					arrow = document.createElement("DIV");
					arrow.className = "dhx_cal_next_button";
					arrow.style.cssText="left:auto; right:0px;top:2px;position:absolute;";
					arrow.innerHTML = "&nbsp;";
					h.lastChild.appendChild(arrow);
					arrow.onclick=function(){
						scheduler.scrollUnit(pr.step);
					};
				}
			}
		}
		return ret;

	};

	var _reset_scale = scheduler._reset_scale;
	scheduler._reset_scale = function(){
		var pr = scheduler._props[this._mode];
		var scale_height = scheduler.xy.scale_height;
		if (pr && pr.days > 1){
			if(!this._header_resized){
				this._header_resized = scheduler.xy.scale_height;
				scheduler.xy.scale_height = scale_height * 2;
			}
		}else{
			if(this._header_resized){
				scheduler.xy.scale_height /= 2;
				this._header_resized = false;
			}
		}
		_reset_scale.apply(this, arguments);
	};

	var _get_view_end = scheduler._get_view_end;
	scheduler._get_view_end = function(){
		var pr = scheduler._props[this._mode];
		if(pr && pr.days > 1) {
			var dd = this._get_timeunit_start();
			return scheduler.date.add(dd, pr.days, "day");
		}else{
			return _get_view_end.apply(this, arguments);
		}
	};

	var xh = scheduler._render_x_header;
	scheduler._render_x_header = function(i, left, d, h) {

		var pr = scheduler._props[this._mode];
		if(!pr || pr.days <= 1) {
			return xh.apply(this, arguments);
		}else if(pr.days > 1){

			var scale_height = scheduler.xy.scale_height;
			scheduler.xy.scale_height = Math.ceil(scale_height / 2);
			xh.call(this, i, left, d, h, Math.ceil(scheduler.xy.scale_height));

			var units_l = pr.options.length;
			// second scale
			if( (i+1)%units_l === 0 ) {
				var head = document.createElement("DIV");
				head.className = "dhx_scale_bar dhx_second_scale_bar";
				var date = this.date.add(this._min_date, Math.floor(i/units_l), "day");
				if (this.templates[this._mode + "_second_scalex_class"]) {
					head.className += ' ' + this.templates[this._mode + "_second_scalex_class"](new Date(date));
				}
				var s_left,
					s_width = this._cols[i]*units_l - 1;
				if(units_l > 1)
					s_left = this._colsS[i-(units_l-1)] - this.xy.scale_width - 2; //borders
				else
					s_left = left;
				

				this.set_xy(head, s_width, this.xy.scale_height - 2, s_left, 0); //-1 for border
				head.innerHTML = this.templates[this._mode + "_second_scale_date"](new Date(date), this._mode); //TODO - move in separate method
				h.appendChild(head);
			}

			scheduler.xy.scale_height = scale_height;
		}
	};

	var r = scheduler._get_event_sday;
	scheduler._get_event_sday=function(ev){
		var pr = scheduler._props[this._mode];
		if (pr){
			if(pr.days <= 1){
				fix_und(pr,ev);
				return this._get_section_sday(ev[pr.map_to]);
			}else{
				var dx = 24*60*60*1000;
				var ind = Math.floor(((ev.end_date.valueOf()-1 - ev.end_date.getTimezoneOffset() * 60 * 1000) -// -1 for events with 00:00 end time
					(scheduler._min_date.valueOf() - scheduler._min_date.getTimezoneOffset() * 60 * 1000))/dx);

				var units_l = pr.options.length;
				var section_index = pr.order[ev[pr.map_to]];
				return ( ind * units_l + section_index ) - pr.position;
			}

		}
		return r.call(this,ev);
	};
	scheduler._get_section_sday = function(section){
		var pr = scheduler._props[this._mode];
		return pr.order[section]-pr.position;
	};

	var l = scheduler.locate_holder_day;
	scheduler.locate_holder_day=function(a,b,ev) {
		var pr = scheduler._props[this._mode];
		if (!pr) {
			return l.apply(this, arguments);
		}
		var section;
		if (!ev) {
			ev = {
				start_date: a,
				end_date: a
			};
			section = 0;
		}
		else {
			fix_und(pr, ev);
		}
		if (pr.days <= 1) {
			return (section === undefined ? pr.order[ev[pr.map_to]] : section) * 1 + (b ? 1 : 0) - pr.position;
		} else {
			var dx = 24 * 60 * 60 * 1000;
			var ind = Math.floor((ev.start_date.valueOf() - scheduler._min_date.valueOf()) / dx); // -1 for events with 00:00 end time
			var units_l = pr.options.length;
			var section_index = section === undefined ? pr.order[ev[pr.map_to]] : section;
			return (ind * units_l + section_index * 1) + (b ? 1 : 0) - pr.position;
		}
	};

	var o = scheduler._time_order;
	scheduler._time_order = function(evs){
		var pr = scheduler._props[this._mode];
		if (pr){
			evs.sort(function(a,b){
				return pr.order[a[pr.map_to]]>pr.order[b[pr.map_to]]?1:-1;
			});
		} else
			o.apply(this,arguments);
	};


	var prerender = scheduler._pre_render_events_table;
	scheduler._pre_render_events_table = function(evs, hold){
		var pr = scheduler._props[this._mode];

		// split multiday event into several one-day parts
		if(pr && pr.days > 1 && !this.config.all_timed){
			var days = {};
			for(var i = 0; i < evs.length; i++){
				var ev = evs[i];
				if(!this.isOneDayEvent(evs[i])){

					var to = new Date(Math.min(+ev.end_date, +this._max_date)),
						from = new Date(Math.max(+ev.start_date, +this._min_date));
					evs.splice(i, 1);


					while(+from < +to){
						var chunk = this._copy_event(ev);
						chunk.start_date = from;
						chunk.end_date = getNextDay(chunk.start_date);
						from = scheduler.date.add(from, 1, 'day');

						var date = +scheduler.date.date_part(new Date(from));
						if(!days[date])
							days[date] = [];
						days[date].push(chunk);
						evs.splice(i, 0, chunk);
						i++;
					}
					i--;
				}else{
					var date = +scheduler.date.date_part(new Date(ev.start_date));
					if(!days[date])
						days[date] = [];
					days[date].push(ev);
				}

			}


			var res = [];
			for(var i in days){
				res.splice.apply(res, [res.length - 1, 0].concat(prerender.apply(this, [days[i], hold])) );
			}
			//var evs = prerender.apply(this, [evs, hold]);
			for (var i = 0; i < res.length; i++) {
				if (this._ignores[res[i]._sday]) {
					res.splice(i, 1);
					i--;
				}
				else {
					res[i]._first_chunk = res[i]._last_chunk = false;
				}
			}
			res.sort(function(a, b) {
				if (a.start_date.valueOf() == b.start_date.valueOf())
					return a.id > b.id ? 1 : -1;
				return a.start_date > b.start_date ? 1 : -1;
			});
			evs = res;
		}else{
			evs = prerender.apply(this, [evs, hold]);
		}

		function getNextDay(date){
			var next_day = scheduler.date.add(date, 1, "day");
			next_day = scheduler.date.date_part(next_day);
			return next_day;
		}
		return evs;
	};

	scheduler.attachEvent("onEventAdded",function(id,ev){
		if (this._loading) return true;
		for (var a in scheduler._props){
			var pr = scheduler._props[a];
			if (typeof ev[pr.map_to] == "undefined")
				ev[pr.map_to] = pr.options[0].key;
		}
		return true;
	});
	scheduler.attachEvent("onEventCreated",function(id,n_ev){
		var pr = scheduler._props[this._mode];
		if (pr && n_ev){
			var ev = this.getEvent(id);
			fix_und(pr,ev);
			var pos = this._mouse_coords(n_ev);
			this._update_unit_section({view:pr, event:ev, pos:pos});

			this.event_updated(ev);
		}
		return true;
	});
})();


});
