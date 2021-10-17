function callMethod (method) {
	return async (req, res) => {
		let result;

		try {
			result = await method(req, res);
		} catch (e) {
			result =  {
				action: "error",
				message: e.message
			}
		}
		res.setHeader('Content-Type', 'application/json');
		res.json(result);
	}
};

module.exports = {
	setRoutes (app, prefix, storage) {
		app.get(`${prefix}`, callMethod((req) => {
			return storage.getAll(req.query);
		}));

		app.post(`${prefix}`, callMethod((req) => {
			return storage.insert(req.body);
		}));

		app.put(`${prefix}/:id`, callMethod((req) => {
			return storage.update(req.params.id, req.body);
		}));

		app.delete(`${prefix}/:id`, callMethod((req) => {
			return storage.delete(req.params.id);
		}));
	}
};