
import * as fs from 'fs';
import * as path from 'path';
import { AccountingAPIClient } from '../AccountingAPIClient';
import { createSingleInvoiceRequest, createMultipleInvoiceRequest } from './request-body/invoice.request.examples';
import { getPrivateConfig } from './helpers/integration.helpers';

describe('Invoices endpoint', () => {
	describe('as Private app', () => {

		let xero: AccountingAPIClient;

		let invoiceIds: string[] = [];
		const tmpDownloadFile = path.resolve(__dirname, './temp_result.pdf');

		beforeAll(() => {
			const config = getPrivateConfig();
			xero = new AccountingAPIClient(config);
		});

		it('create single', async () => {
			const response = await xero.invoices.create(createSingleInvoiceRequest);

			expect(response.Invoices.length).toBe(1);
			expect(response.Invoices[0].InvoiceID).toBeTruthy();

			invoiceIds = invoiceIds.concat(response.Invoices.map((invoice) => invoice.InvoiceID));
		});

		// skip: we don't ever delete invoices from Xero, so let's limit the number we create
		it.skip('create multiple', async () => {
			const response = await xero.invoices.create(createMultipleInvoiceRequest);

			expect(response.Invoices.length).toBe(createMultipleInvoiceRequest.Invoices.length);
			expect(response.Invoices[0].InvoiceID).toBeTruthy();
			expect(response.Invoices[1].InvoiceID).toBeTruthy();

			invoiceIds = invoiceIds.concat(response.Invoices.map((invoice) => invoice.InvoiceID));
		});

		it('get all', async () => {
			const response = await xero.invoices.get();

			expect(response).toBeDefined();
			expect(response.Id).toBeTruthy();
			expect(response.Invoices.length).toBeGreaterThanOrEqual(invoiceIds.length);
			expect(response.Invoices[0].InvoiceID).toBeTruthy();
		});

		it('get single', async () => {
			const response = await xero.invoices.get({ InvoiceID: invoiceIds[0] });

			expect(response).toBeDefined();
			expect(response.Id).toBeTruthy();
			expect(response.Invoices).toHaveLength(1);
			expect(response.Invoices[0].InvoiceID).toBe(invoiceIds[0]);
		});

		it('get single as pdf', async () => {
			const response = await xero.invoices.savePDF({ InvoiceID: invoiceIds[0], savePath: tmpDownloadFile });

			expect(response).toBeUndefined();
			const invoiceBuffer = fs.readFileSync(tmpDownloadFile);
			expect(invoiceBuffer.byteLength).toBeGreaterThan(3000); // Let's hope all PDFs are bigger than 3000B
		});

		describe('Invalid requests', () => {
			it('creating an invalid invoice', async () => {
				const createInvalidInvoiceRequest = { ...createSingleInvoiceRequest, ...{ Type: 'ImNotARealType' } };

				const response = await xero.invoices.create(createInvalidInvoiceRequest);

				expect(response.Invoices).toHaveLength(1);
				expect(response.Invoices[0].HasErrors).toBeTruthy();
				expect(response.Invoices[0].ValidationErrors.length).toBeGreaterThanOrEqual(1);
			});
		});

		afterAll(() => {
			// delete the file
			fs.unlinkSync(tmpDownloadFile);

			// archive the invoices
			const updateRequestBody = invoiceIds.map((invoiceId) => ({ InvoiceID: invoiceId, Status: 'DELETED' }));
			xero.invoices.updateMultiple(updateRequestBody);
		});
	});
});