/** Dependencies **/
import { SendMailOptions } from 'nodemailer';

export type MailerSendMailOptions = SendMailOptions & {
  template?: string;
  context?: any;
}
