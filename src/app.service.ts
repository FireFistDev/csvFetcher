import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from './prisma.service';
import * as csvParser from 'csv-parser';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetchCsvData() {
    try {
      let counter = 0;
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
          if (counter === 0) {
            counter++;
            return;
          }
          counter++;

          delete data._6;

          if (counter > 20) {
            response.data.destroy();
            return;
          }

          const [day, month, year] = data.date.split('/');
          const formattedDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
          );
          formerData.push({...data,date:formattedDate})
          await this.prisma.chance.createMany({
            data:formerData,
            skipDuplicates: true, // Skip 'Bobo'
          });
        });
      return 'great job ';
    } catch (error) {
      console.log(error);
    }
  }
}
