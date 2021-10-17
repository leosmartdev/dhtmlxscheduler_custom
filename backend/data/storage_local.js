require("date-format-lite"); // add date format
var xssFilters = require('xss-filters');

const generateId = (items) => {
	let maxId = 1;
	for(let i in items){
		if(Number(items[i].id) > maxId){
			maxId = Number(items[i].id);
		}
	}

	return maxId + 1;
};

class Storage {
	constructor(collection, params) {
		this._datastore = {};
		this._params = params || {};
		if (collection) {
			collection.forEach(item => {
				this._datastore[item.id] = Object.assign({}, item);
				if(item.start_date){
					this._datastore[item.id].start_date = item.start_date.date();
				}
				if(item.end_date){
					this._datastore[item.id].end_date = item.end_date.date();
				}
			});
		}
	}

	// get events from the table, use dynamic loading if parameters sent
	async getAll(params) {
		let selectFrom;
		let selectTo;
		if (params.from && params.to) {
			selectFrom = params.from.date();
			selectTo = params.to.date();
		}

		const entriesToLoad = [];
		for (let i in this._datastore) {
			const event = this._datastore[i];
			if (selectFrom && selectTo) {
				if (event.end_date >= selectFrom && event.start_date < selectTo) {
					entriesToLoad.push(event);
				}
			} else {
				entriesToLoad.push(event);
			}
		}

		const result = entriesToLoad.map((entry) => {
			var serialized = Object.assign({}, entry);
			for (let i in serialized) {
				if (Object.prototype.toString.call(serialized[i]) === "[object Date]") {
					serialized[i] = serialized[i].format("YYYY-MM-DD hh:mm");
				} else if (typeof serialized[i] === "string") {
					serialized[i] = xssFilters.inHTMLData(serialized[i]);
				}
			}
			return serialized;
		});

		if(this._params.objectResult || this._params.collections){
			var res = {
				data: result
			};
			if(this._params.collections){
				res.collections = this._params.collections
			};
			return res;
		}else{
			return result;
		}
	}

	// create new event
	async insert(data) {
		data.start_date = data.start_date.date();
		data.end_date = data.end_date.date();
		data.id = generateId(this._datastore);
		this._datastore[data.id] = data;

		return {
			action: "inserted",
			tid: data.id
		}
	}

	// update event
	async update(id, data) {
		var entry = this._datastore[id];
		if (entry) {
			for (let i in data) {
				if (i === "start_date" || i === "end_date") {
					entry[i] = data[i].date();
				} else {
					entry[i] = data[i];
				}
			}

		}

		return {
			action: "updated"
		}
	}

	// delete event
	async delete(id) {
		delete this._datastore[id];

		return {
			action: "deleted"
		}
	}
}

module.exports = Storage;
