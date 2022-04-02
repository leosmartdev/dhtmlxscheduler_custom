
const Storage = require("./storage_local");
const ComboStorage = require("./storage_combo");
const RecurringStorage = require("./storage_recurring_local");

const seed = require("./seed/data");

var setRoutes = (prefix, app, router) => {
	// add listeners to basic CRUD requests
	const typedEventsStorage = new Storage(seed.eventsWithTypes, { objectResult: true });
	const eventsWithTypeCollection = new Storage(seed.eventsWithTypes, {
		objectResult: true, collections: {
			type: seed.eventTypes
		}
	});
	const multiselectEvents = new Storage(seed.multiselectEvents, {
		objectResult: true, collections: {
			fruits: seed.fruits,
			users: seed.users
		}
	});

	router.setRoutes(app, `${prefix}/events`, new Storage(seed.events));
	router.setRoutes(app, `${prefix}/map-events`, new Storage(seed.mapEvents));
	router.setRoutes(app, `${prefix}/treetimeline-events`, new Storage(seed.timelineEvents));
	router.setRoutes(app, `${prefix}/typed-events`, typedEventsStorage);
	router.setRoutes(app, `${prefix}/typed-events-types`, eventsWithTypeCollection);
	router.setRoutes(app, `${prefix}/multiselect-events`, multiselectEvents);
	router.setRoutes(app, `${prefix}/countries`, new ComboStorage(seed.countries));
	router.setRoutes(app, `${prefix}/recurring_events`, new RecurringStorage(seed.recurringEvents));
};

module.exports = (app, router) => {
	// add listeners to basic CRUD requests
	setRoutes("/backend", app, router);
	setRoutes("/scheduler/backend", app, router);
};