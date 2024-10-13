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

    await Promise.all([
      PackageService.updateLocalPackagePrice(basic, 20_00, 'Göteborg', date),
      PackageService.updateLocalPackagePrice(basic, 30_00, 'Stockholm', date),
    ])

    // These should be included
    date.setFullYear(2020);

    await Promise.all([
      PackageService.updateLocalPackagePrice(basic, 30_00, 'Göteborg', date),
      PackageService.updateLocalPackagePrice(basic, 40_00, 'Stockholm', date),
      PackageService.updateLocalPackagePrice(basic, 100_00, 'Stockholm', date),
    ])

    expect(await PriceService.getPriceHistory(basic.name, date.getFullYear())).toEqual({
      Göteborg: [30_00],
      Stockholm: [40_00, 100_00],
    });
  });

  it('Supports filtering on municipality', async () => {
    const basic = await Package.create({ name: 'basic', priceCents: 20_00 });

    const date = new Date();

    date.setFullYear(2020);

    await Promise.all([
      PackageService.updateLocalPackagePrice(basic, 20_00, 'Malmö', date),
      PackageService.updateLocalPackagePrice(basic, 30_00, 'Stockholm', date),
      PackageService.updateLocalPackagePrice(basic, 100_00, 'Stockholm', date),
    ]);

    expect(await PriceService.getPriceHistory(basic.name, date.getFullYear(), 'Stockholm')).toEqual({
      Stockholm: [30_00, 100_00],
    });
  });

  it('Sorts the results alphabetically and  chronologically', async () => {
    const basic = await Package.create({ name: 'basic', priceCents: 20_00 });

    const date = new Date();

    date.setFullYear(2019);
    date.setMonth(1);

    await Promise.all([
      PackageService.updateLocalPackagePrice(basic, 30_00, 'Malmö', date),
      PackageService.updateLocalPackagePrice(basic, 50_00, 'Stockholm', date),
      PackageService.updateLocalPackagePrice(basic, 30_00, 'Stockholm', date),
    ])

    date.setMonth(11);

    await Promise.all([
      PackageService.updateLocalPackagePrice(basic, 20_00, 'Göteborg', date),
      PackageService.updateLocalPackagePrice(basic, 40_00, 'Stockholm', date),
    ]);

    expect(await PriceService.getPriceHistory(basic.name, date.getFullYear())).toEqual({
      Göteborg:[20_00],
      Malmö:[30_00],
      Stockholm: [30_00, 50_00, 40_00],
    });
  })

});
