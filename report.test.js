const request = require('supertest');
const app = require('./server'); // Załóżmy, że Twój serwer znajduje się w pliku app.js
const mongoose = require('mongoose');
const Incoming = require('./Incoming');

jest.mock('../models/Incoming');

describe('GET /api/incoming-goods/report', () => {
    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should return a report with incoming goods', async () => {
        const mockIncomingGoods = [
            {
                createdAt: new Date('2024-03-01T10:00:00Z'),
                goodsId: { itemName: 'Item A' },
                quantity: 10,
                supplierId: { supplierName: 'Supplier X' }
            },
            {
                createdAt: new Date('2024-03-02T12:00:00Z'),
                goodsId: { itemName: 'Item B' },
                quantity: 5,
                supplierId: { supplierName: 'Supplier Y' }
            }
        ];

        Incoming.find.mockResolvedValue(mockIncomingGoods);

        const res = await request(app).get('/api/incoming-goods/report');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                date: '2024-03-01',
                itemName: 'Item A',
                quantity: 10,
                supplier: 'Supplier X'
            },
            {
                date: '2024-03-02',
                itemName: 'Item B',
                quantity: 5,
                supplier: 'Supplier Y'
            }
        ]);
    });

    it('should return an empty array if no data is found', async () => {
        Incoming.find.mockResolvedValue([]);
        const res = await request(app).get('/api/incoming-goods/report');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
        Incoming.find.mockRejectedValue(new Error('Database error'));
        const res = await request(app).get('/api/incoming-goods/report');
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: 'Error fetching report data' });
    });
});
