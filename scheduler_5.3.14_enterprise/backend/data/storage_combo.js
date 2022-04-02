const Storage = require("./storage_local")

class ComboStorage extends Storage{
	constructor (collection, params) {
		super(collection, params);
	}

	async getAll(params) {

		const entriesToLoad = [];
		console.log(params);

		if(params.id){
			for (let i in this._datastore) {
				const item = this._datastore[i];
				if(item.id == params.id){
					entriesToLoad.push(item);
					break;
				}
			}
		}else if(params.mask){
			for (let i in this._datastore) {
				const item = this._datastore[i];
				if(item.text.indexOf(params.mask) > -1){
					entriesToLoad.push(item);
				}
			}
		}else{
			for (let i in this._datastore) {
				const item = this._datastore[i];
				entriesToLoad.push(item);
			}
		}

		const result = entriesToLoad.map((entry) => {
			return {
				value: entry.id,
				text: entry.text
			};
		});

		return {
			options: result
		};

	}
}

module.exports = ComboStorage;
