'use strict';

var ModelCreator = require(process.env.CS_API_TOP + '/lib/util/restful/model_creator');
var Marker = require('./marker');
var Allow = require(process.env.CS_API_TOP + '/lib/util/allow');
var BoundAsync = require(process.env.CS_API_TOP + '/lib/util/bound_async');

class MarkerCreator extends ModelCreator {

	get modelClass () {
		return Marker;
	}

	get collectionName () {
		return 'markers';
	}

	createMarker (attributes, callback) {
		return this.createModel(attributes, callback);
	}

	getRequiredAttributes () {
		return ['teamId', 'streamId', 'postId', 'commitHash', 'location'];
	}

	allowAttributes (callback) {
		Allow(
			this.attributes,
			{
				string: ['teamId', 'streamId', 'postId', 'commitHash'],
				'array(number)': ['location']
			}
		);
		process.nextTick(callback);
	}

	preSave (callback) {
		BoundAsync.series(this, [
			this.validateLocationAttribute,
			this.createId,
			this.updateMarkerLocations,
			super.preSave
		], callback);
	}

	static validateLocation (location) {
		if (!(location instanceof Array)) {
			return 'location must be an array';
		}
		else if (location.length > 4) {
			return 'location array is too long';
		}
		else if (location.find(coordinate => typeof coordinate !== 'number')) {
			return 'location array must consist only of numbers';
		}
	}

	validateLocationAttribute (callback) {
		let error = MarkerCreator.validateLocation(this.attributes.location);
		if (error) {
			return callback(this.errorHandler.error('validation', { info: error }));
		}
		this.location = this.attributes.location;
		delete this.attributes.location; // this actually goes into the markerLocations structure, stored separately
		callback();
	}

	createId (callback) {
		this.attributes._id = this.data.markers.createId();
		callback();
	}

	updateMarkerLocations (callback) {
		let id = `${this.attributes.streamId}|${this.attributes.commitHash}`.toLowerCase();
		delete this.attributes.commitHash;
		let op = {
			$set: {
				teamId: this.attributes.teamId,
				[`locations.${this.attributes._id}`]: this.location
			}
		};
		this.data.markerLocations.applyOpById(id, op, callback, { databaseOptions: { upsert: true }});
	}
}

module.exports = MarkerCreator;
