import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import * as  csvParser from 'csv-parser';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetchCsvData() {
    try {
      let counter = 0;
      console.log('start Fetching')
      const response = await axios.get('https://www.pais.co.il/chance/chance_resultsDownload.aspx', {
        headers: { Accept: 'text/csv' },
        responseType: 'stream',
      });
      response.data
        .pipe(csvParser(['date', 'id', 'r1', 'r2', 'r3', 'r4']))
        .on('data', async (data) => {

          if (counter === 0){
            counter++;
            return
          };

          delete data._6;
          counter++;

          if (counter > 20) {
            response.data.destroy();
            return;
          }

          
          if (await this.prisma.chance.findFirst({ where: { id: data.id } })) {
            console.log('thats object alredy existed')
            return;
          }
          const  [day, month, year] = data.date.split('/');
          const formattedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          console.log(formattedDate, day, month ,year)
          await this.prisma.chance.create({
            data: { ...data, date: formattedDate.toISOString() },
          });

        });
        return 'great job '
    } catch (error) {
      console.log(error);
    }
  }
}
