import { get } from 'lodash';
import { Injectable } from '@nestjs/common';
import { MailerOptions } from './interfaces/mailer-options.interface';
import { TemplateAdapter } from './interfaces/template-adapter.interface';
import { createTransport, Transporter } from 'nodemailer';
import previewEmail from 'preview-email';
import { MailerSendMailOptions } from './interfaces/mailer-send-mail-options.interface';
import { getLogger, Logger } from 'log4js';
import { Options } from 'nodemailer/lib/mailer';

const VERIFY_INTERVAL = 1000 * 60;

@Injectable()
export class NestMailClient {
  options: MailerOptions;
  transporter: Transporter;
  logger: Logger;
  isVerified: boolean;

  constructor(options: MailerOptions) {
    this.options = options;
    if (!this.options.transport) {
      throw new Error('invalid transport field in options');
    }
    this.transporter = createTransport(this.options.transport, this.options.defaults);
    this.logger = options.logger || getLogger('NestMailClient');
    this.initTemplate();
    this.verify();
  }

  private initTemplate() {
    const templateAdapter: TemplateAdapter = get(this.options, 'template.adapter');
    if (templateAdapter) {
      this.transporter.use('compile', (mail, callback) => {
        if (!(mail.data as MailerSendMailOptions).template || mail.data.html || mail.data.text) {
          return callback();
        }

        return templateAdapter.compile(mail, callback, this.options);
      });

      if (this.options.preview) {
        this.transporter.use('stream', (mail, callback) => {
          return previewEmail(mail.data, this.options.preview)
            .then(() => callback())
            .catch(callback);
        });
      }
    }
  }

  private verify() {
    this.isVerified = false;
    this.logger.info(`transporter verifying...`);
    this.transporter.verify(err => {
      if (err) {
        this.logger.error(`transporter verify failed! ${err}`);
        if (err['errno'] === 'ETIMEDOUT') {
          setTimeout(this.verify.bind(this), VERIFY_INTERVAL);
        }
      } else {
        this.isVerified = true;
        this.logger.info(`transporter verified!`);
        if ((this.options.defaults as Options)?.to) {
          this.sendMail({
            subject: '邮件客户端初始化成功',
            text: '邮件客户端初始化成功',
          });
        }
      }
    });
  }

  public async sendMail(sendMailOptions: MailerSendMailOptions) {
    if (!this.isVerified) {
      this.logger.warn(`transporter is not verified!`);
      return;
    }
    await this.transporter.sendMail(sendMailOptions, (err, info) => {
      if (err) {
        this.logger.error(`send mail failed! ${err}`);
        if (err['errno'] === 'ETIMEDOUT') {
          this.verify();
        }
      } else {
        this.logger.info(`send mail success! info: ${JSON.stringify(info)}`);
      }
    });
  }
}
