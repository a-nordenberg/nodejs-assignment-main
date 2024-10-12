import {sequelizeConnection} from '../db/config'
import {LocalPrice} from '../models/localprice';
import {Package} from '../models/package';
import {Price} from '../models/price';

export default {
  async getAll() {
    return await Package.findAll({
			include: [
				{model: Price, as: 'prices'},
        {model: LocalPrice, as: 'localPrices'}
			],
		});
  },
  async updatePackagePrice(pack: Package, newPriceCents: number) {
    try {
      const newPackage = await sequelizeConnection.transaction(async t => {
        await Price.create({
          packageId: pack.id,
          priceCents: pack.priceCents,
          municipality: 'Base Price',
        }, { transaction: t });

        pack.priceCents = newPriceCents;

        return pack.save({ transaction: t });
      });

      return newPackage;
    } catch (err: unknown) {
      throw new Error('Error handling the transaction');
    }
  },

  async updateLocalPackagePrice(pack: Package, newPriceCents: number, municipality: string, atDate?: Date) {
    try {
      return await sequelizeConnection.transaction(async t => {
        console.log('atDate is: ' + atDate)
        const localPrice = await LocalPrice.findOne({
          where: { packageId: pack.id, municipality },
          transaction: t
        });
        // if no localPrice was found, create a new one, otherwise save current price to log, then update with new price
        if (!localPrice) {
          const price = await Price.create({
            packageId: pack.id,
            priceCents: newPriceCents,
            createdAt: atDate,
            updatedAt: atDate,
            municipality: municipality
          }, { transaction: t });
          console.log('new price:');
          console.log(price);
          await LocalPrice.create({
            packageId: pack.id,
            municipality,
            priceCents: newPriceCents,
          }, { transaction: t });
        } else {
          const price = await Price.create({
            packageId: pack.id,
            priceCents: newPriceCents,
            createdAt: atDate,
            updatedAt: atDate,
            municipality: municipality
          }, { transaction: t });
          console.log('new price:');
          console.log(price);
          localPrice.priceCents = newPriceCents;
          await localPrice.save({ transaction: t });
        }
  
        return pack;
      });
    } catch (err) {
      console.error('Error handling the transaction, error is: ', err);
      throw new Error('Error handling the transaction, ' + err);
    }
  },

	async priceFor(name: string, municipality?: string) {
    // always return base package, also return localPrice for municipality if provided and found
    const foundPackage = await Package.findOne({
      where: { name: name },
      include: municipality ? [{
          model: LocalPrice,
          as: 'localPrices',
          where: { municipality: municipality },
          required: false
      }] : []
    });
    if (!foundPackage) {
      return null;
    }
    // if a municipality was part of query and a price for said municipality was found, return it
    if (municipality && foundPackage.localPrices && foundPackage.localPrices.length > 0) {
      return foundPackage.localPrices[0].priceCents;
    }
    // if municipality was not part of query, or if package was found but no localPrice matching the municipality, then return base price
    return foundPackage.priceCents;
	},
};
