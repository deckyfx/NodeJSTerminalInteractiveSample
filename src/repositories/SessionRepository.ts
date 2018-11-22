import * as rp from "request-promise-native"
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from "jsdom";
import RepositoryBase from "./RepositoryBase";
import Util from "../Util";
import _ = require("lodash");

type RequestConfig = Array<{ search?: string, tagtext?: string, data: string }>;

export default abstract class SessionRepository extends RepositoryBase {
    public static SESSION: SabreSession;
    public static SESSION_URL: string = "https://webservices.sabre.com/websvc";
    public static SESSION_USERNAME: string = "103852";
    public static SESSION_PASSWORD: string = "WS568251";
    public static SESSION_ORGANIZATION: string = "15MI";
    public static SESSION_DOMAIN: string = "DEFAULT";

    public url: string = SessionRepository.SESSION_URL; 

    private static saveTokenToFile() {
        fs.writeFileSync(path.join("caches", "sabresession.key"), JSON.stringify(SessionRepository.SESSION));
    }

    private static clearTokenFile() {
        fs.writeFileSync(path.join("caches", "sabresession.key"), "");
    }

    private static loadTokenToFile(): SabreSession | null {
        let data = fs.readFileSync(path.join("caches", "sabresession.key")).toString();
        if (data.length == 0) {
            return null;
        }
        SessionRepository.SESSION = Object.assign(new SabreSession("", "", "", new Date(), ""), JSON.parse(data));
        return SessionRepository.SESSION;
    }

    private static readXML(file: string, configuration?: RequestConfig): string {
        const xmls: { [key:string]: { file: string, action?: string } } = {
            "soap:request": {
                file: "sabre_soap_request.xml"
            },
            "soap:header": {
                file: "sabre_soap_header.xml"
            },
            "session:create": {
                file: "sabre_create_session.xml"
            },
            "session:close": {
                file: "sabre_close_session.xml",
                action: "SessionCloseRQ"
            },
            "session:refresh": {
                file: "sabre_refresh_session.xml",
                action: "OTA_PingRQ"
            },
            "hotel:incity": {
                file: "get_hotel_incity.xml",
                action: "OTA_HotelAvailLLSRQ"
            },
            "hotel:content": {
                file: "get_hotel_content.xml",
                action: "GetHotelContentRQ"
            },
            "hotel:description": {
                file: "get_hotel_description.xml",
                action: "HotelPropertyDescriptionLLSRQ"
            }
        }
        let request = "";
        let body        = fs.readFileSync(path.join("xml", xmls[file].file)).toString();
        if (file == "session:create") {
            request = body;
        } else {
            let header      = fs.readFileSync(path.join("xml", xmls["soap:header"].file)).toString();
            request         = fs.readFileSync(path.join("xml", xmls["soap:request"].file)).toString();
            request         = request.replace("{REQUEST_HEADER}", header).replace("{REQUEST_BODY}", body);
            let action      = xmls[file].action!;
            request         = request.replace(`{REQUEST_ACTION}`, action);
        }
        if (configuration) {
            _.forEach(configuration, (config) => {
                if (config.search) {
                    request  = request.replace(`{${config.search}}`, config.data);
                }
                if (config.tagtext) {
                    request = SessionRepository.replaceTextInsideTag(request, config.tagtext, config.data);
                }
            });
        }
        request = request.replace('\n', "").replace('\\n', "").replace('\t', "");
        return request;
    }

    public static request(file: string, configuration?: RequestConfig): Promise<JSDOM> {
        let datastring = this.readXML(file, configuration);
        return SessionRepository.SessionIsValid()
        .then((valid) => {
            if (valid) {
                datastring = SessionRepository.replaceTextInsideTag(datastring, 'wsse:BinarySecurityToken', SessionRepository.SESSION.BinarySecurityToken);                
                return SessionRepository.doRequest(datastring);
            } else {
                return this.createSession()
                .then((session) => {
                    datastring = SessionRepository.replaceTextInsideTag(datastring, 'wsse:BinarySecurityToken', session.BinarySecurityToken);
                    return SessionRepository.doRequest(datastring);
                });
            }
        });
    }

    public static SessionIsValid(): Promise<boolean> {
        return Promise.resolve(SessionRepository.SESSION != null);
    }

    public static closeSession(): Promise<boolean> {
        let session = SessionRepository.loadTokenToFile();
        if (session != null) {
            SessionRepository.SESSION = session;
        }
        if (SessionRepository.SESSION == null) {
            return Promise.resolve(true);
        }
        Util.vorpal.log("Clearing local session");
        SessionRepository.clearTokenFile();
        return Promise.resolve(true);
        /*
        Util.vorpal.log("Closing sabre session");
        let datastring = SessionRepository.readXML("session:close");
        await SessionRepository.doRequest(datastring);
        return Promise.resolve(true);
        */
    }

    public static refreshSession(): Promise<SabreSession> {
        Util.vorpal.log("Refreshing sabre session");
        let datastring = SessionRepository.readXML("session:refresh", [{
            search: 'TIMESTAMP',
            data: (new Date()).toString(),
        }]);
        return SessionRepository.doRequest(datastring)
        .then((dom) => {
            SessionRepository.saveTokenToFile();
            return Promise.resolve(SessionRepository.SESSION);
        });
    }

    public static createSession(): Promise<SabreSession> {
        let session = SessionRepository.loadTokenToFile();
        if (session != null) {
            SessionRepository.SESSION = session; 
            Util.vorpal.log("Loadin sabre session from cache");
            return Promise.resolve(SessionRepository.SESSION);
        }
        Util.vorpal.log("Creating sabre session");
        let datastring = SessionRepository.readXML("session:create", [{
            tagtext: 'wsse:username',
            data: SessionRepository.SESSION_USERNAME,
        }, {
            tagtext: 'wsse:password',
            data: SessionRepository.SESSION_PASSWORD,
        }, {
            tagtext: 'Organization',
            data: SessionRepository.SESSION_ORGANIZATION,
        }, {
            tagtext: 'Domain',
            data: SessionRepository.SESSION_DOMAIN,
        }]);
        return SessionRepository.doRequest(datastring)
        .then((dom) => {
            const document          = dom.window.document;
            const binary            = document.getElementsByTagName('wsse:BinarySecurityToken')[0].textContent!;
            const conversationId    = document.getElementsByTagName('eb:ConversationId')[0].textContent!;
            const messageId         = document.getElementsByTagName('eb:MessageId')[0].textContent!;
            const timestamp         = new Date(document.getElementsByTagName('eb:Timestamp')[0].textContent!);
            const refmessage        = document.getElementsByTagName('eb:RefToMessageId')[0].textContent!;
            SessionRepository.SESSION = new SabreSession(binary, conversationId, messageId, timestamp, refmessage); 
            SessionRepository.saveTokenToFile();
            return Promise.resolve(SessionRepository.SESSION);
        });
    }

    public static doRequest(datastring: string): Promise<JSDOM> {
        Util.spinner.start();
        return rp({
            uri: SessionRepository.SESSION_URL,
            method: 'POST',
            body: datastring,
            headers: {
                'content-type': 'text/xml'
            },
            timeout: 20000, // 20 seconds
        }).then((htmlString: string) => {
            Util.spinner.stop();
            return new Promise<JSDOM>(function(resolve, reject) {
                const dom = new JSDOM(htmlString, {
                    contentType: "text/xml",
                });
                return resolve(dom);
            });
        }).catch((err) => {
            Util.spinner.stop();
            return Promise.reject(err);
        });
    }

    public static replaceTextInsideTag(source: string, tag: string, replace: string): string {
        const regex = new RegExp(`(<${tag}>)([^<]*)(</${tag}>)`, "gi");
        return source.replace(regex, `$1${replace}$3`);
    }
}

export class RunArguments {
    public constructor(public citycodes: Array<string>) {

    }
}

export class SabreSession {
    public constructor(
        public BinarySecurityToken: string, 
        public ConversationId: string, 
        public MessageId: string, 
        public Timestamp: Date,  
        public RefToMessageId: string,) {
    }
}