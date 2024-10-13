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

  async updateLocalPackagePrice (
    pack: Package, 
    newPriceCents: number, 
    municipality: string, 
    atDate?: Date, 
    retries = 3
  ): Promise<Package> {
    try {
      return await sequelizeConnection.transaction(async t => {
        const [localPrice, created] = await LocalPrice.findOrCreate({
          where: { packageId: pack.id, municipality },
          defaults: { priceCents: newPriceCents, packageId: pack.id, municipality: municipality },
          transaction: t
        });
        // Save current price to log and update with new price
        await Price.create({
        packageId: pack.id,
        priceCents: newPriceCents,
        createdAt: atDate,
        updatedAt: atDate,
        municipality: municipality
        }, { transaction: t });        

        if (!created) {
          localPrice.priceCents = newPriceCents;
          await localPrice.save({ transaction: t });
        }
  
        return pack;
      });
    } catch (err) {
      if( err instanceof Error ) {
        // if sequelize timeout error, retry 3 times. reduces concurrency related errors
        if (err.name === 'SequelizeDatabaseError' || err.name === 'SequelizeTimeoutError') {
          if (retries > 0) {
            console.warn(`Retrying transaction due to error: ${err.message}. Retries left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait half a second, then try again
            return await this.updateLocalPackagePrice(pack, newPriceCents, municipality, atDate, retries - 1);
          }
        }
      }
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
