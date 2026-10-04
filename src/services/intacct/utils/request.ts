import { session } from "./session";

export function request(body: string): string {
  const id =  session();
  return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <control><senderid>null</senderid><password>null</password><controlid>controlid</controlid><uniqueid>false</uniqueid><dtdversion>3.0</dtdversion></control>
  <operation>
    <authentication><sessionid>${id}</sessionid></authentication>
    <content>${body}</content>
  </operation>
</request>`;
}