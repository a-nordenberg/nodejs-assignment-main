import { sequelizeConnection } from '../../db/config';
import { Package } from '../../models/package';
import PackageService from '../../services/package.service';
import PriceService from '../../services/price.service';

describe('PriceService', () => {
	// Set the db object to a variable which can be accessed throughout the whole test file
	const db = sequelizeConnection;
  const packageService = PackageService;
  const priceService = PriceService;

	// Before any tests run, clear the DB and run migrations with Sequelize sync()
	beforeEach(async () => {
		await db.sync({force: true});
	});

	afterAll(async () => {
		await db.close();
	});

  it('Returns the pricing history for the provided year and package', async () => {
    const basic = await Package.create({ name: 'basic', priceCents: 20_00 });

    const date = new Date();

    // These should NOT be included
    date.setFullYear(2019);

    await packageService.updateLocalPackagePrice(basic, 20_00, 'Göteborg', date);
		await packageService.updateLocalPackagePrice(basic, 30_00, 'Stockholm', date);

    // these should be included
    date.setFullYear(2020);
    await packageService.updateLocalPackagePrice(basic, 30_00, 'Göteborg', date);
		await packageService.updateLocalPackagePrice(basic, 40_00, 'Stockholm', date);
    await packageService.updateLocalPackagePrice(basic, 100_00, 'Stockholm', date);

    expect(await PriceService.getPriceHistory(basic.name, date.getFullYear())).toEqual({
      Göteborg: [30_00],
      Stockholm: [40_00, 100_00],
    });
  });

  it('Supports filtering on municipality', async () => {
    const basic = await Package.create({ name: 'basic', priceCents: 20_00 });
    
    const date = new Date();
    
    date.setFullYear(2020);
    // this one should not be included
    await packageService.updateLocalPackagePrice(basic, 20_00, 'Göteborg', date);
    // these two should be included
    await packageService.updateLocalPackagePrice(basic, 30_00, 'Stockholm', date);
    await packageService.updateLocalPackagePrice(basic, 100_00, 'Stockholm', date);

    expect(await PriceService.getPriceHistory(basic.name, date.getFullYear(), 'Stockholm')).toEqual({
      Stockholm: [30_00, 100_00],
    });
  })
});
