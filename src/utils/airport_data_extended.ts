import * as Backbone from "backbone";
import * as _ from "lodash";
const airports = require('airport-codes');
const airportsJSON = require('../../node_modules/airport-codes/airports.json');

export class AirportDataExtended extends Backbone.Collection<Backbone.Model>{
    private static instance: AirportDataExtended;

    static getInstance() {
        if (!AirportDataExtended.instance) {
            AirportDataExtended.instance = new AirportDataExtended();
            // ... any one time initialization goes here ...
        }
        return AirportDataExtended.instance;
    }

    public search(type: string, letters: string): Array<Backbone.Model>  {
        var words = letters.split(/\s+/),
            models = _.clone(this.models);        
        _.each(words, function(word) {
            var pattern = new RegExp(word, "i");
            models = _.filter(models, (model) =>{
                return pattern.test(model.get(type)) && model.has('iata');
            });
        });
        return models;
    }

    public startWith(type:string, letters: string): Array<Backbone.Model>  {
        var models = _.clone(this.models);    
        var pattern = new RegExp(`^${letters}`, "i");
        models = _.filter(models, (model) => {
            return pattern.test(model.get(type)) && model.has('iata');
        });
        return models;
    }

    public containsValue(type:string, letters: string): Array<Backbone.Model>  {
        var models = _.clone(this.models);    
        var pattern = new RegExp(`${letters}`, "i");
        models = _.filter(models, (model) => {
            return pattern.test(model.get(type)) && model.has('iata');
        });
        return models;
    }

    private constructor() {
        super(airportsJSON)
        this.comparator = 'name';
    }
}

export default AirportDataExtended.getInstance();