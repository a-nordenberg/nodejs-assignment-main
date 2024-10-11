import {sequelizeConnection} from '../../db/config';
import { LocalPrice } from '../../models/localprice';
import {Package} from '../../models/package';
import { Price } from '../../models/price'
import PackageService from '../../services/package.service';

describe('PackageService', () => {
	// Set the db object to a variable which can be accessed throughout the whole test file
	const db = sequelizeConnection;
	const packageService = PackageService;

	// Before any tests run, clear the DB and run migrations with Sequelize sync()
	beforeEach(async () => {
		await db.sync({force: true});
	});

	afterAll(async () => {
		await db.close();
	});

	it('Updates the current price of the provided package', async () => {
		const pack = await Package.create({ name: 'Dunderhonung', priceCents: 0 });

		const newPackage = await packageService.updatePackagePrice(pack, 200_00);

		expect(newPackage.priceCents).toBe(200_00);
	});

	it('Stores the old price of the provided package in its price history', async () => {
    const pack = await Package.create({ name: 'Dunderhonung', priceCents: 100_00 });

		await packageService.updatePackagePrice(pack, 200_00);

		const priceHistory = await Price.findAll({ where: { packageId: pack.id } });
		
		expect(priceHistory.length).toBe(1);
    	expect(priceHistory[0].priceCents).toBe(100_00);
  	});

	// This tests cover feature request 1. Feel free to add more tests or change
	// the existing one.
	it('Supports adding a price for a specific municipality', async () => {
		const pack = await Package.create({name: 'Dunderhonung', priceCents: 0});

		await packageService.updateLocalPackagePrice(pack, 200_00, 'Göteborg');
		
		const response = await packageService.priceFor('Dunderhonung', 'Göteborg');

		expect(response).toBe(200_00);
	});
	
	it('Updates existing local price of the provided package', async () => {
		const pack = await Package.create({ name: 'Dunderhonung', priceCents: 0 });
	
		await packageService.updateLocalPackagePrice(pack, 200_00, 'Göteborg');
		await packageService.updateLocalPackagePrice(pack, 299_00, 'Göteborg');
		const localPrices = await LocalPrice.findAll({ where: { packageId: pack.id }});
	
		expect(localPrices.length).toBe(1);
		expect(localPrices[0].priceCents).toBe(299_00);
		expect(localPrices[0].municipality).toBe('Göteborg');
	});
	
	it('Keeps two concurrent localPrices with different municipalities', async () => {
		const pack = await Package.create({ name: 'Dunderhonung', priceCents: 190_00 });
	
		await packageService.updateLocalPackagePrice(pack, 200_00, 'Göteborg');
		await packageService.updateLocalPackagePrice(pack, 150_00, 'Uppsala');
		const localPrices = await LocalPrice.findAll({ where: { packageId: pack.id }});
	
		expect(localPrices.length).toBe(2);
		expect(localPrices[0].priceCents).toBe(200_00);
		expect(localPrices[0].municipality).toBe('Göteborg');
		expect(localPrices[1].priceCents).toBe(150_00);
		expect(localPrices[1].municipality).toBe('Uppsala');
	});

	it('Returns base price as fallback if no matching LocalPrice is found', async () => {
		const pack = await Package.create({ name: 'Dunderhonung', priceCents: 100_00 });

		await packageService.updateLocalPackagePrice(pack, 200_00, 'Göteborg');
		const localPrice = await packageService.priceFor('Dunderhonung', 'Uppsala');

		expect(localPrice).toBe(100_00);
	})
});
