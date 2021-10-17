
const Storage = require("./storage_local")
require("date-format-lite"); // add date format

class RecurringStorage extends Storage{
	constructor (collection, params) {
		super(collection, params);
	}

	// create new event
	async insert(data) {
		const result = await super.insert(data);
		// delete a single occurrence from  recurring series
		if (data.rec_type == "none") {
			result.action = "deleted";
		}

		return result;
	}

	// update event
	async update(id, data) {
		if (data.rec_type && data.rec_type != "none") {
			// all modified occurrences must be deleted when we update recurring series
			// https://docs.dhtmlx.com/scheduler/server_integration.html#savingrecurringevents

			for (let i in this._datastore) {
				if (this._datastore[i].event_pid == id) {
					delete this._datastore[i];
				}
			}
		}
		return await super.update(id, data);
	}

	// delete event
	async delete(id) {

		// some logic specific to recurring events support
		// https://docs.dhtmlx.com/scheduler/server_integration.html#savingrecurringevents

		const event = this._datastore[id];

		if (event.event_pid) {
			// deleting modified occurrence from recurring series
			// If an event with the event_pid value was deleted - it needs updating with rec_type==none instead of deleting.
			event.rec_type = "none";
			return await this.update(id, event);
		}

		if (event.rec_type && event.rec_type != "none") {
			// if a recurring series was deleted - delete all modified occurrences of the series
			for (let i in this._datastore) {
				if (this._datastore[i].event_pid == id) {
					delete this._datastore[i];
				}
			}
		}

		return await super.delete(id);
	}
}

module.exports = RecurringStorage;
