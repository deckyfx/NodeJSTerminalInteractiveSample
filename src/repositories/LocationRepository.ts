import RepositoryBase from "./RepositoryBase";
import PortCity from "../models/PortCity";
import Util from "../Util";
import * as _ from "lodash";

export default class LocationRepository extends RepositoryBase {
    public SearchLocation(term: string, option: any): Promise<Array<PortCity>> {
        let match = term.match(/^[A-Z]{3}$/);
        let backbone_collections;
        if (match) {
            backbone_collections = Util.airports.startWith('iata', term);
        } else {
            const a = Util.airports.containsValue('city', term);
            const b = Util.airports.containsValue('country', term);
            backbone_collections = _.uniqWith(_.concat(a, b), (arrval, othval) => {
                return arrval.get('iata') === othval.get('iata');
            });
        }
        let results: Array<PortCity> = new Array<PortCity>();        
        backbone_collections.forEach((city: any) => {
            let cdata = Util.country.lookup.countries({name: city.get('country')});
            let ccode = (cdata.length > 0)? cdata[0].alpha: '';
            if (city.get('iata')) {
                let result = new PortCity(
                    city.get('city'),
                    city.get('country'),
                    ccode,
                    city.get('iata')
                );
                result.name = city.get('name');
                results.push(result);
            }
        });
        return Promise.resolve(results);
    }
}