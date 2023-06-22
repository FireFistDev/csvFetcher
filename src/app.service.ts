import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import * as  moment from 'moment-timezone';
import * as csvParser from 'csv-parser';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetchCsvData() {
    try {
      let formerData = []
      console.log('start Fetching');
      const response = await axios.get(
        'https://www.pais.co.il/chance/chance_resultsDownload.aspx',
        {
          headers: { Accept: 'text/csv' },
          responseType: 'stream',
        },
      );

      response.data
        .pipe(csvParser(['date', 'id', 'r1', 'r2', 'r3', 'r4']))
        .on('data', async (data) => {
          delete data._6;
          formerData.push(data)
          })
          .on('end', async()=>{
            await this.prisma.chance.createMany({
              data: formerData.slice(1,20).map(elem =>{
                console.log(elem)
                return {
                  ...elem, date: moment.utc(`${elem.date.split('/').reverse().join('-')} 00:00.000`).tz("israel").format()
                }
              }),skipDuplicates:true
            })
          })
      return 'great job ';
    } catch (error) {
      console.log(error);
    }
  }
}
