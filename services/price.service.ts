import { Package } from '../models/package'
import { Price } from '../models/price'
import { Op } from 'sequelize';

type PricingHistoryResponse = {
  [municipality: string]: number[];
};

export default {
  async getPriceHistory(packageName:string, year:number, municipality?:string) {
    const pack = await Package.findOne({ where: { name: packageName } });
    if (!pack) {
      throw new Error('No such package exists');
    }
    // retrieve every price log entry that has been created or updated during the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    
    const historicalPrices = await Price.findAll({
      where: {
        packageId: pack.id,
        [Op.or]: [
          { createdAt: { [Op.between]: [startDate, endDate] } },
          { updatedAt: { [Op.between]: [startDate, endDate] } },
        ],
        ...(municipality && { municipality }),
      },
      order: [
        ['municipality', 'ASC'], // sort municipalities alphabetically from a to z
        ['createdAt', 'ASC'], // sort by createdAt within each municipality
        ['priceCents', 'ASC'], // sort prices with same timestamp from lowest to highest
      ],
    });
    // categorize the price log entries based on municipality and convert to response format of municipality:[prices]
    const priceHistory: PricingHistoryResponse = {};
    historicalPrices.forEach(entry => {
      if (!priceHistory[entry.municipality]) {
        priceHistory[entry.municipality] = [];
      }
      priceHistory[entry.municipality].push(entry.priceCents);
    });
    return priceHistory;
  },
};