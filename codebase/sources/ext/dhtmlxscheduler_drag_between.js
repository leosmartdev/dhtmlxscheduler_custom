/*
@license
dhtmlxScheduler v.4.4.9 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler._external_drag = {
	from_scheduler :null,
	to_scheduler: null,
	drag_data:null,
	drag_placeholder : null,
	delete_dnd_holder : function(){
		var node = this.drag_placeholder;
		if(!node)
			return;
		if(node.parentNode)
			node.parentNode.removeChild(node);
		document.body.className = document.body.className.replace(" dhx_no_select", "");
		this.drag_placeholder = null;
	},
	copy_event_node : function(event, scheduler){
		var clone = null;
		for (var i = 0; i < scheduler._rendered.length; i++){
			var node = scheduler._rendered[i];
			if (node.getAttribute("event_id") == event.id || node.getAttribute("event_id") == scheduler._drag_id) {
				clone = node.cloneNode(true);
				clone.style.position = clone.style.top = clone.style.left = "";
				break;
			}
		}
		return clone || document.createElement("div");
	},
	create_dnd_holder : function(event, scheduler){
		if(this.drag_placeholder)
			return this.drag_placeholder;

		var holder = document.createElement("div");
		var html = scheduler.templates.event_outside(event.start_date, event.end_date, event);
		if(html){
			holder.innerHTML = html;
		}else{
			holder.appendChild(this.copy_event_node(event, scheduler));
		}

		holder.className = "dhx_drag_placeholder";
		holder.style.position = "absolute";
		this.drag_placeholder = holder;
		document.body.appendChild(holder);
		document.body.className += " dhx_no_select";
		return holder;
	},
	move_dnd_holder : function(e){
		var pos = {x: e.clientX, y: e.clientY};
		this.create_dnd_holder(this.drag_data.ev, this.from_scheduler);
		if(!this.drag_placeholder){
			return;
		}
		var x = pos.x,
			y = pos.y;

		var html = document.documentElement,
			body = document.body,
			holder = this.drag_placeholder;

		holder.style.left = 10 + x + (html && html.scrollLeft || body && body.scrollLeft || 0) - (html.clientLeft || 0) + "px";
		holder.style.top = 10 + y + (html && html.scrollTop || body && body.scrollTop || 0) - (html.clientTop || 0) + "px";
	},
	clear_scheduler_dnd : function(scheduler){
		scheduler._drag_id = scheduler._drag_mode = scheduler._drag_event = scheduler._new_event = null;
	},
	stop_drag : function(scheduler){
		if(scheduler){
			this.clear_scheduler_dnd(scheduler);
		}
		this.delete_dnd_holder();
		this.drag_data = null;
	},
	inject_into_scheduler : function(event, scheduler, dom_event){
		event._count = 1; // reset order calculation for the new location (scheduler)
		event._sorder = 0;

		if(event.event_pid && event.event_pid != "0") {
			event.event_pid = null;
			event.rec_type = event.rec_pattern = "";
			event.event_length = 0;
		}

		scheduler._drag_event = event;
		scheduler._events[event.id] = event;
		scheduler._drag_id = event.id;
		scheduler._drag_mode = "move";

		//resolve event position
		if(dom_event)
			scheduler._on_mouse_move(dom_event);
	},
	start_dnd : function(scheduler){
		if(!scheduler.config.drag_out)
			return;

		this.from_scheduler = scheduler;
		this.to_scheduler = scheduler;
		var drag = this.drag_data = {};
		drag.ev = scheduler._drag_event;
		drag.orig_id = scheduler._drag_event.id;
	},
	land_into_scheduler : function(scheduler, e){
		if(!scheduler.config.drag_in){
			this.move_dnd_holder(e);
			return false;
		}

		var drag = this.drag_data;

		var ev = scheduler._lame_clone(drag.ev); // _lame_clone - helper for deep copy

		if(scheduler != this.from_scheduler){
			ev.id = scheduler.uid();
			var duration = ev.end_date - ev.start_date;
			ev.start_date = new Date(scheduler.getState().min_date);
			ev.end_date = new Date(ev.start_date.valueOf() + duration);
		}else{
			ev.id = this.drag_data.orig_id;
			ev._dhx_changed = true;
		}
		this.drag_data.target_id = ev.id;
		if(!scheduler.callEvent("onBeforeEventDragIn", [ev.id, ev, e]))
			return false;
		this.to_scheduler = scheduler;
		this.inject_into_scheduler(ev, scheduler, e);
		this.delete_dnd_holder();
		scheduler.updateView();
		scheduler.callEvent("onEventDragIn", [ev.id, ev, e]);
		return true;
	},

	drag_from_scheduler : function(scheduler, e){
		if(this.drag_data && scheduler._drag_id && scheduler.config.drag_out){
			if(this.to_scheduler == scheduler){
				this.to_scheduler = null;
			}
			if(!scheduler.callEvent("onBeforeEventDragOut", [scheduler._drag_id, scheduler._drag_event, e])){
				return false;
			}
			this.create_dnd_holder(this.drag_data.ev, scheduler);
			var id = scheduler._drag_id;
			this.drag_data.target_id = null;
			delete scheduler._events[id];
			this.clear_scheduler_dnd(scheduler);
			scheduler.updateEvent(id);
			scheduler.callEvent("onEventDragOut", [id, this.drag_data.ev, e]);
			return true;

		}else{
			return false;
		}
	},
	reset_event : function(event, scheduler){
		this.inject_into_scheduler(event, scheduler);
		this.stop_drag(scheduler);
		scheduler.updateView();
	},
	move_permanently : function(original_event, moved_event, from, to){
		to.callEvent("onEventAdded", [moved_event.id, moved_event]);

		// delete from original calendar
		this.inject_into_scheduler(original_event, from);
		this.stop_drag(from);
		if(original_event.event_pid && original_event.event_pid != "0") {
			from.callEvent("onConfirmedBeforeEventDelete", [original_event.id]);
			from.updateEvent(moved_event.event_pid);
		} else {
			from.deleteEvent(original_event.id);
		}
		from.updateView();
		to.updateView();
	}
};

dhtmlxEvent(window, "load", function(){
	dhtmlxEvent(document.body, "mousemove", function(e) {

		var dnd = Scheduler._external_drag;
		var target_scheduler = dnd.target_scheduler;

		if(target_scheduler){
			if(!dnd.from_scheduler){
				// start dragging event inside initial scheduler
				if(target_scheduler.getState().drag_mode == "move" && target_scheduler.config.drag_out){
					dnd.start_dnd(target_scheduler);
				}
			}else{
				if(target_scheduler._drag_id){
					// moving event inside target scheduler
				}else{
					// dragging event into target scheduler
					var source = dnd.to_scheduler;//previos target scheduler
					if(!source || dnd.drag_from_scheduler(source, e)){
						dnd.land_into_scheduler(target_scheduler, e);
					}
				}
			}
		}else if(dnd.from_scheduler){
			if(!dnd.to_scheduler){
				//dragging outside schedulers
				dnd.move_dnd_holder(e);
			}else{
				// dragging out of target scheduler
				dnd.drag_from_scheduler(dnd.to_scheduler, e);
			}
		}

		dnd.target_scheduler = null;
	});
	dhtmlxEvent(document.body, "mouseup", function(e) {
		var dnd = Scheduler._external_drag;
		var from = dnd.from_scheduler,
			to = dnd.to_scheduler;

		if(from){
			if(to && from == to){
				// drop back to the same calendar
				from.updateEvent(dnd.drag_data.target_id);
			}else if(to && from !== to){
				// drop to another scheduler
				var original = dnd.drag_data.ev;
				var ev = to.getEvent(dnd.drag_data.target_id);
				if(from.callEvent("onEventDropOut", [original.id, original, to, e])){
					dnd.move_permanently(original, ev, from, to);
				}else{
					dnd.reset_event(original, from);
				}
			}else{
				// drop outside schedulers
				var original = dnd.drag_data.ev;
				if(from.callEvent("onEventDropOut", [original.id, original, null, e])){
					dnd.reset_event(original, from);
				}
			}
		}
		dnd.stop_drag();
		dnd.current_scheduler = dnd.from_scheduler = dnd.to_scheduler = null;
	});

});

Scheduler.plugin(function(scheduler) {
	scheduler.config.drag_in = true;
	scheduler.config.drag_out = true;
	scheduler.templates.event_outside = function(start, end, event){};
	var dnd = Scheduler._external_drag;
	scheduler.attachEvent("onTemplatesReady", function(){
		dhtmlxEvent(scheduler._obj, "mousemove", function(e){
			dnd.target_scheduler = scheduler;
		});
		dhtmlxEvent(scheduler._obj, "mouseup", function(e){
			dnd.target_scheduler = scheduler;
		});
	});
});