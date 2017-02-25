"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ObjectTemplate = require('supertype');
var PersistObjectTemplate = require('../../index.js')(ObjectTemplate, null, ObjectTemplate);
PersistObjectTemplate.debugInfo = 'api;conflict;write;read;data'; //'api;io';
PersistObjectTemplate.debugInfo = 'conflict;data'; //'api;io';
PersistObjectTemplate.logger.setLevel('debug');
var chai_1 = require("chai");
var _ = require("underscore");
var Customer_1 = require("./Customer");
var Promise = require("bluebird");
var Role_1 = require("./Role");
var Account_1 = require("./Account");
var ReturnedMail_1 = require("./ReturnedMail");
var Address_1 = require("./Address");
var Transaction_1 = require("./Transaction");
var schema = {
    Customer: {
        documentOf: 'pg/customer',
        children: {
            roles: { id: 'customer_id' },
            referrers: { id: 'referred_id', filter: { property: 'type', value: 'primary' } },
            secondaryReferrers: { id: 'referred_id', filter: { property: 'type', value: 'secondary' } },
            primaryAddresses: { id: 'customer_id', fetch: true, filter: { property: 'type', value: 'primary' }, pruneOrphans: true },
            secondaryAddresses: { id: 'customer_id', fetch: true, filter: { property: 'type', value: 'secondary' }, pruneOrphans: true }
        },
        parents: {
            referredBy: { id: 'referred_id' }
        }
    },
    Address: {
        documentOf: 'pg/address',
        parents: {
            account: { id: 'account_id' },
            customer: { id: 'customer_id' }
        },
        children: {
            returnedMail: { id: 'address_id', fetch: true }
        }
    },
    ReturnedMail: {
        documentOf: 'pg/rm',
        parents: {
            address: { id: 'address_id' }
        }
    },
    Account: {
        documentOf: 'pg/account',
        children: {
            roles: { id: 'account_id', fetch: false },
            transactions: { id: 'account_id', fetch: false },
            fromAccountTransactions: { id: 'from_account_id', fetch: false }
        },
        parents: {
            address: { id: 'address_id', fetch: true }
        }
    },
    Role: {
        documentOf: 'pg/role',
        parents: {
            customer: { id: 'customer_id', fetch: 'yes' },
            account: { id: 'account_id' }
        }
    },
    Transaction: {
        documentOf: 'pg/transaction',
        parents: {
            account: { id: 'account_id', fetch: true },
            fromAccount: { id: 'from_account_id' }
        }
    },
    Xfer: {
        documentOf: 'pg/transaction'
    },
    Debit: {
        documentOf: 'pg/transaction'
    },
    Credit: {
        documentOf: 'pg/transaction'
    },
    CascadeSaveCheck: {
        documentOf: 'pg/cascadeSaveCheck',
        cascadeSave: true,
        children: {
            arrayOfFirstLevel: { id: 'firstlevel_id' }
        }
    },
    FirstLevel: {
        documentOf: 'pg/FirstLevel',
        parents: {
            cascadeCheck: { id: 'firstlevel_id' },
            address: { id: 'address_id' }
        }
    }
};
function clearCollection(template) {
    var collectionName = template.__collection__.match(/\//) ? template.__collection__ : 'mongo/' + template.__collection__;
    if (collectionName.match(/pg\/(.*)/)) {
        collectionName = RegExp.$1;
        return PersistObjectTemplate.dropKnexTable(template)
            .then(function () {
            return PersistObjectTemplate.synchronizeKnexTableFromTemplate(template).then(function () { return 0; });
        });
    }
    else
        throw 'Invalid collection name ' + collectionName;
}
describe('Banking from pgsql Example', function () {
    var knex;
    it('opens the database Postgres', function () {
        return Promise.resolve()
            .then(function () {
            knex = require('knex')({
                client: 'pg',
                debug: true,
                connection: {
                    host: '127.0.0.1',
                    database: 'persistor_banking',
                    user: 'postgres',
                    password: 'postgres'
                }
            });
            PersistObjectTemplate.setDB(knex, PersistObjectTemplate.DB_Knex, 'pg');
            PersistObjectTemplate.setSchema(schema);
            PersistObjectTemplate.performInjections(); // Normally done by getTemplates
        }).catch(function (e) { throw e; });
    });
    it('clears the bank', function () {
        return clearCollection(Role_1.Role)
            .then(function (count) {
            chai_1.expect(count).to.equal(0);
            return clearCollection(Account_1.Account);
        }).then(function (count) {
            chai_1.expect(count).to.equal(0);
            return clearCollection(Customer_1.Customer);
        }).then(function (count) {
            chai_1.expect(count).to.equal(0);
            return clearCollection(Account_1.Account);
        }).then(function (count) {
            chai_1.expect(count).to.equal(0);
            return clearCollection(Transaction_1.Transaction);
        }).then(function (count) {
            chai_1.expect(count).to.equal(0);
            return clearCollection(ReturnedMail_1.ReturnedMail);
        }).then(function (count) {
            chai_1.expect(count).to.equal(0);
            return clearCollection(Address_1.Address);
        }).then(function (count) {
            chai_1.expect(count).to.equal(0);
        }).catch(function (e) {
            throw e;
        });
    });
    var sam;
    var karen;
    var ashling;
    var samsAccount;
    var jointAccount;
    it('can create the data', function () {
        // Setup customers and addresses
        sam = new Customer_1.Customer('Sam', 'M', 'Elsamman');
        karen = new Customer_1.Customer('Karen', 'M', 'Burke');
        ashling = new Customer_1.Customer('Ashling', '', 'Burke');
        // Setup referrers
        sam.referrers = [ashling, karen];
        ashling.referredBy = sam;
        karen.referredBy = sam;
        sam.local1 = 'foo';
        sam.local2 = 'bar';
        // Setup addresses
        sam.addAddress('primary', ['500 East 83', 'Apt 1E'], 'New York', 'NY', '10028');
        sam.addAddress('secondary', ['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');
        sam.secondaryAddresses[0].addReturnedMail(new Date());
        sam.secondaryAddresses[0].addReturnedMail(new Date());
        karen.addAddress('primary', ['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
        karen.addAddress('secondary', ['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');
        karen.primaryAddresses[0].addReturnedMail(new Date());
        ashling.addAddress('primary', ['End of the Road', ''], 'Lexington', 'KY', '34421');
        // Setup accounts
        samsAccount = new Account_1.Account(123412341234123, ['Sam Elsamman'], sam, sam.primaryAddresses[0]);
        jointAccount = new Account_1.Account(.123412341234123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.primaryAddresses[0]);
        jointAccount.addCustomer(karen, 'joint');
        jointAccount.addCustomer(ashling, 'joint');
        samsAccount.credit(100); // Sam has 100
        samsAccount.debit(50); // Sam has 50
        jointAccount.credit(200); // Joint has 200
        jointAccount.transferTo(100, samsAccount); // Joint has 100, Sam has 150
        jointAccount.transferFrom(50, samsAccount); // Joint has 150, Sam has 100
        jointAccount.debit(25); // Joint has 125
    });
    it('both accounts have the right balance', function () {
        chai_1.expect(samsAccount.getBalance()).to.equal(100);
        chai_1.expect(jointAccount.getBalance()).to.equal(125);
    });
    it('check server side fetch property..', function () {
        return samsAccount.addressFetch(0, 1).then(function (address) {
            chai_1.expect(address.street).to.not.equal('');
        });
    });
    it('can insert', function (done) {
        PersistObjectTemplate.begin();
        sam.setDirty();
        ashling.setDirty();
        karen.setDirty();
        PersistObjectTemplate.end().then(function (result) {
            chai_1.expect(result).to.equal(true);
            done();
        }).catch(function (e) { done(e); });
    });
    it('Accounts have addresses', function (done) {
        Account_1.Account.getFromPersistWithQuery(null, { address: true, transactions: false, fromAccountTransactions: false }).then(function (accounts) {
            chai_1.expect(accounts.length).to.equal(2);
            chai_1.expect(accounts[0].address.__template__.__name__).to.equal('Address');
            chai_1.expect(accounts[0].number).to.equal(123412341234123);
            chai_1.expect(accounts[1].number).to.equal(.123412341234123);
            chai_1.expect(accounts[0].roles[0].customer.firstName).to.equal('Sam');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Dummy fetchProperty call, object already contains the values', function () {
        Account_1.Account.getFromPersistWithQuery(null, { address: true }).then(function (accounts) {
            accounts[0].fetchProperty('roles', null, { sort: { _id: 1 } });
        }).catch(function (e) {
            throw e;
        });
    });
    it('Dummy fetchProperty call, object already contains the values', function () {
        Account_1.Account.getFromPersistWithQuery(null, { address: true }).then(function (accounts) {
            accounts[0].fetchProperty('roles', null, { sort: { _id: 0 } });
        }).catch(function (e) {
            throw e;
        });
    });
    it('Customers have addresses', function (done) {
        Customer_1.Customer.getFromPersistWithQuery(null, { primaryAddresses: true, secondaryAddresses: true }).then(function (customers) {
            chai_1.expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
                customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
                customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Accounts sloppily replace addresses', function (done) {
        sam.primaryAddresses.splice(0, 1);
        sam.addAddress('primary', ['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
        Promise.resolve()
            .then(function () {
            return sam.persistSave();
        })
            .then(function () {
            return sam.primaryAddresses[0].persistSave();
        })
            .then(function () { done(); })
            .catch(function (e) {
            done(e);
        });
    });
    it('Customers have addresses', function (done) {
        Customer_1.Customer.getFromPersistWithQuery(null, { primaryAddresses: true, secondaryAddresses: true }).then(function (customers) {
            chai_1.expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
                customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
                customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Transactions have accounts fetched', function (done) {
        Transaction_1.Xfer.getFromPersistWithQuery({ type: 'xfer' }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(2);
            chai_1.expect(!!transactions[0].account._id).to.equal(true);
            chai_1.expect(!!transactions[1].account._id).to.equal(true);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can find debits and credits >= 200 with a $in', function (done) {
        //{type: {$in: ['debit', 'credit']}, amount:{'$gte': 200}}
        //{$and: [{$in: ['debit', 'credit']}}, {amount:{'$gte': 200}}}
        Transaction_1.Transaction.getFromPersistWithQuery({ type: { $in: ['debit', 'credit'] }, amount: { '$gte': 200 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(1);
            chai_1.expect(transactions[0].amount).to.equal(200);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can find debits with $eq', function () {
        Transaction_1.Transaction.getFromPersistWithQuery({ type: { $eq: ['debit'] } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(0);
        });
    });
    it('get all transactions with with $lt', function () {
        Transaction_1.Transaction.getFromPersistWithQuery({ amount: { '$lt': 500 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(6);
        });
    });
    it('get all transactions with with $lte', function () {
        return Transaction_1.Transaction.getFromPersistWithQuery({ amount: { '$lte': 500 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(6);
        });
    });
    it('get all transactions with with $ne', function () {
        return Transaction_1.Transaction.getFromPersistWithQuery({ amount: { '$ne': 100 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(4);
        });
    });
    it('$exists operator not supported', function () {
        return Transaction_1.Transaction.getFromPersistWithQuery({ amount: { '$exists': false } })
            .catch(function (e) {
            chai_1.expect(e).to.equal('Can\'t handle amount:{"$exists":false}');
        });
    });
    it('Can find debits and credits >= 200 with a $in', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({ type: { $in: ['debit', 'credit'] }, amount: { '$in': [200, 100], $gt: 100 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(1);
            chai_1.expect(transactions[0].amount).to.equal(200);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can find debits and credits with a $or', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({ '$or': [{ type: 'debit' }, { type: 'credit' }] }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(4);
            chai_1.expect(transactions[0].type).to.not.equal('xfer');
            chai_1.expect(transactions[1].type).to.not.equal('xfer');
            chai_1.expect(transactions[2].type).to.not.equal('xfer');
            chai_1.expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can find debits and credits with a $in', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({ type: { $in: ['debit', 'credit'] } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(4);
            chai_1.expect(transactions[0].type).to.not.equal('xfer');
            chai_1.expect(transactions[1].type).to.not.equal('xfer');
            chai_1.expect(transactions[2].type).to.not.equal('xfer');
            chai_1.expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can find debits and credits with a regex', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({ type: { $regex: '^.*It$', $options: 'i' } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(4);
            chai_1.expect(transactions[0].type).to.not.equal('xfer');
            chai_1.expect(transactions[1].type).to.not.equal('xfer');
            chai_1.expect(transactions[2].type).to.not.equal('xfer');
            chai_1.expect(transactions[3].type).to.not.equal('xfer');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    var transactionIds = [];
    it('Can fetch all transactions', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({}, null, null, null, null, null, { sort: { _id: 1 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(6);
            transactions.forEach(function (t) { transactionIds.push(t._id); });
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can fetch the first transaction', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({}, null, 0, 1, null, null, { sort: { _id: 1 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(1);
            chai_1.expect(transactions[0]._id).to.equal(transactionIds[0]);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can fetch the next to last transaction', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({}, null, 4, 1, null, null, { sort: { _id: 1 } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(1);
            chai_1.expect(transactions[0]._id).to.equal(transactionIds[4]);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can fetch transfers', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({ type: 'xfer' }, { account: true, fromAccount: true }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(2);
            chai_1.expect(transactions[0].type).to.equal('xfer');
            chai_1.expect(transactions[1].type).to.equal('xfer');
            chai_1.expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            chai_1.expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can fetch transfers with $nin', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({ type: { $nin: ['debit', 'credit'] } }, { account: true, fromAccount: true }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(2);
            chai_1.expect(transactions[0].type).to.equal('xfer');
            chai_1.expect(transactions[1].type).to.equal('xfer');
            chai_1.expect(transactions[0].fromAccount.__template__.__name__).to.equal('Account');
            chai_1.expect(transactions[0].account.__template__.__name__).to.equal('Account');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('can fetch a pojo', function () {
        return PersistObjectTemplate.getPOJOFromQuery(Customer_1.Customer, { firstName: 'Sam' }).then(function (pojo) {
            chai_1.expect(pojo[0].firstName).to.equal('Sam');
        });
    });
    it('can fetch a pojo', function () {
        return PersistObjectTemplate.getPOJOFromQuery(Customer_1.Customer, { firstName: 'Sam' }).then(function (pojo) {
            chai_1.expect(pojo[0].firstName).to.equal('Sam');
        });
    });
    it('fetch using a knex queries in the callback...', function () {
        var func = function (knex) {
            knex.where({ firstName: 'Sam' });
        };
        return PersistObjectTemplate.getPOJOFromQuery(Customer_1.Customer, func).then(function (pojo) {
            chai_1.expect(pojo[0].firstName).to.equal('Sam');
        });
    });
    it('countFromKnexQuery using a knex queries in the callback...', function () {
        var func = function (knex) {
            knex.where({ firstName: 'Sam' });
        };
        return PersistObjectTemplate.countFromKnexQuery(Customer_1.Customer, func).then(function (count) {
            chai_1.expect(count).to.equal(1);
        });
    });
    it('when trying to use where condition on a field that does not exist, getPOJO call should throw an error', function () {
        var func = function (knex) {
            knex.where({ fieldNotAvailable: 'Sam' });
        };
        return PersistObjectTemplate.getPOJOFromQuery.call(PersistObjectTemplate, Customer_1.Customer, func).catch(function (e) {
            chai_1.expect(e.message).to.contain('column "fieldNotAvailable" does not exist');
        });
    });
    it('check persist properties', function () {
        var persistorProps = PersistObjectTemplate.getPersistorProps();
        chai_1.expect(Object.keys(persistorProps)).to.contains('Customer');
    });
    it('can go native parent join', function (done) {
        Transaction_1.Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Transaction_1.Transaction.getTableName('transaction'))
            .rightOuterJoin(Account_1.Account.getTableName('account'), Transaction_1.Transaction.getParentKey('fromAccount', 'transaction'), Account_1.Account.getPrimaryKey('account'))
            .then(processResults);
        function processResults(res) {
            //console.log(JSON.stringify(res))
            chai_1.expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it('can go native child join', function (done) {
        Transaction_1.Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Account_1.Account.getTableName('account'))
            .rightOuterJoin(Transaction_1.Transaction.getTableName('transaction'), Account_1.Account.getChildKey('fromAccountTransactions', 'transaction'), Account_1.Account.getPrimaryKey('account'))
            .then(processResults);
        function processResults(res) {
            //console.log(JSON.stringify(res))
            chai_1.expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it('can go native with apply parent', function (done) {
        Transaction_1.Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Transaction_1.Transaction.getTableName('transaction'))
            .rightOuterJoin.apply(Transaction_1.Transaction.getKnex(), Account_1.Account.knexParentJoin(Transaction_1.Transaction, 'account', 'transaction', 'fromAccount'))
            .then(processResults);
        function processResults(res) {
            //console.log(JSON.stringify(res))
            chai_1.expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it('getTableName without alias name', function () {
        chai_1.expect(Transaction_1.Transaction.getTableName()).to.equal('transaction');
        chai_1.expect(Transaction_1.Transaction.getParentKey('account')).to.equal('account_id');
        chai_1.expect(Account_1.Account.getChildKey('transactions')).to.equal('account_id');
        chai_1.expect(Transaction_1.Transaction.getPrimaryKey()).to.equal('_id');
    });
    it('can go native with apply child', function (done) {
        Transaction_1.Transaction
            .getKnex()
            .select(['transaction.amount', 'account.number'])
            .from(Transaction_1.Transaction.getTableName('transaction'))
            .rightOuterJoin.apply(Account_1.Account.getKnex(), Transaction_1.Transaction.knexChildJoin(Account_1.Account, 'transaction', 'account', 'fromAccountTransactions'))
            .then(processResults);
        function processResults(res) {
            //console.log(JSON.stringify(res))
            chai_1.expect(res[0].amount + res[1].amount).to.equal(150);
            done();
        }
    });
    it('Can find debits and amount $gt 1000 with $and', function () {
        //@TODO: and condition is not working...
        return Transaction_1.Transaction.getFromPersistWithQuery({ '$and': [{ type: 'debit' }, { amount: { $gt: 100 } }] }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(0);
        });
    });
    it('Can find debits and amount $gt 1000 with $and', function () {
        return Transaction_1.Transaction.getFromPersistWithQuery({ type: { $in: ['debit', 'credit'] } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(4);
        });
    });
    it('Can find debits and amount $gt 1000 with $and', function () {
        //@TODO: and condition is not working...
        return Transaction_1.Transaction.getFromPersistWithQuery({ type: { $nin: ['debit'] } }).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(4);
        });
    });
    it('sam looks good on fresh fetch', function (done) {
        Customer_1.Customer.getFromPersistWithId(sam._id, { roles: true }).then(function (customer) {
            chai_1.expect(customer.nullNumber).to.equal(null);
            chai_1.expect(customer.nullString).to.equal(null);
            chai_1.expect(customer.nullDate).to.equal(null);
            chai_1.expect(customer.firstName).to.equal('Sam');
            chai_1.expect(customer.local1).to.equal('local1');
            chai_1.expect(customer.local2).to.equal('local2');
            chai_1.expect(customer.roles[1].relationship).to.equal('primary');
            chai_1.expect(customer.roles[1].customer).to.equal(customer);
            chai_1.expect(customer.roles[1].accountPersistor.isFetched).to.equal(false);
            return customer.roles[1].fetch({ account: { fetch: { roles: { fetch: { customer: { fetch: { roles: true } } } } } } }).then(function () {
                chai_1.expect(customer.roles[1].account.number).to.equal(.123412341234123);
                chai_1.expect(customer.roles[1].account.roles.length).to.equal(3);
                chai_1.expect(customer.primaryAddresses[0].lines[0]).to.equal('500 East 83d');
                chai_1.expect(customer.secondaryAddresses[0].lines[0]).to.equal('38 Haggerty Hill Rd');
                chai_1.expect(customer.secondaryAddresses[0].customer).to.equal(customer);
                chai_1.expect(customer.secondaryAddresses[0].returnedMail.length).to.equal(2);
                var r1 = customer.referrers[0];
                var r2 = customer.referrers[1];
                var karen = r1.firstName == 'Karen' ? r1 : r2;
                var ashling = r1.firstName == 'Karen' ? r2 : r1;
                chai_1.expect(karen.firstName).to.equal('Karen');
                chai_1.expect(ashling.firstName).to.equal('Ashling');
                done();
            });
        }).catch(function (e) {
            done(e);
        });
    });
    it('sam looks good on refresh', function (done) {
        sam.refresh().then(function () {
            var customer = sam;
            chai_1.expect(customer.nullNumber).to.equal(null);
            chai_1.expect(customer.nullString).to.equal(null);
            chai_1.expect(customer.nullDate).to.equal(null);
            chai_1.expect(customer.firstName).to.equal('Sam');
            chai_1.expect(customer.local1).to.equal('foo');
            chai_1.expect(customer.local2).to.equal('bar');
            chai_1.expect(customer.roles[1].relationship).to.equal('primary');
            chai_1.expect(customer.roles[1].customer).to.equal(customer);
            chai_1.expect(customer.roles[1].accountPersistor.isFetched).to.equal(true); // because it was already fetched
            return customer.roles[1].fetch({ account: { fetch: { roles: { fetch: { customer: { fetch: { roles: true } } } } } } }).then(function () {
                chai_1.expect(customer.roles[1].account.number).to.equal(.123412341234123);
                chai_1.expect(customer.roles[1].account.roles.length).to.equal(3);
                chai_1.expect(customer.primaryAddresses[0].lines[0]).to.equal('500 East 83d');
                chai_1.expect(customer.secondaryAddresses[0].lines[0]).to.equal('38 Haggerty Hill Rd');
                chai_1.expect(customer.secondaryAddresses[0].customer).to.equal(customer);
                chai_1.expect(customer.secondaryAddresses[0].returnedMail.length).to.equal(2);
                var r1 = customer.referrers[0];
                var r2 = customer.referrers[1];
                var karen = r1.firstName == 'Karen' ? r1 : r2;
                var ashling = r1.firstName == 'Karen' ? r2 : r1;
                chai_1.expect(karen.firstName).to.equal('Karen');
                chai_1.expect(ashling.firstName).to.equal('Ashling');
                done();
            });
        }).catch(function (e) {
            done(e);
        });
    });
    it('has a correct joint account balance for sam', function (done) {
        Account_1.Account.getFromPersistWithId(samsAccount._id, { roles: true }).then(function (account) {
            chai_1.expect(account.getBalance()).to.equal(samsAccount.getBalance());
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('has a correct joint account balance for the joint account', function (done) {
        Account_1.Account.getFromPersistWithId(jointAccount._id, { roles: true }).then(function (account) {
            chai_1.expect(account.getBalance()).to.equal(jointAccount.getBalance());
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can fetch all transactions', function (done) {
        Transaction_1.Transaction.getFromPersistWithQuery({}).then(function (transactions) {
            chai_1.expect(transactions.length).to.equal(6);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('getFromPersistWithId without id value', function () {
        return Transaction_1.Transaction.getFromPersistWithId(null).catch(function (e) {
            chai_1.expect(e.message).to.contain('The operator "undefined" is not permitted');
        });
    });
    it('getFromPersistWithId without id value', function () {
        return Transaction_1.Transaction.getFromPersistWithId(null).catch(function (e) {
            chai_1.expect(e.message).to.contain('The operator "undefined" is not permitted');
        });
    });
    it('Customers have addresses after update of customer that does not fetch them', function (done) {
        Customer_1.Customer.getFromPersistWithQuery(null, { primaryAddresses: false, secondaryAddresses: false })
            .then(function (customers) {
            return customers[0].persistSave();
        }).then(function () {
            return Customer_1.Customer.getFromPersistWithQuery(null, { primaryAddresses: true, secondaryAddresses: true });
        }).then(function (customers) {
            chai_1.expect(customers[0].primaryAddresses.length + customers[0].secondaryAddresses.length +
                customers[1].primaryAddresses.length + customers[1].secondaryAddresses.length +
                customers[2].primaryAddresses.length + customers[2].secondaryAddresses.length).to.equal(5);
            done();
        })
            .catch(function (e) {
            done(e);
        });
    });
    it('Can update addresses', function (done) {
        Customer_1.Customer.getFromPersistWithId(sam._id).then(function (customer) {
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            customer.secondaryAddresses[0].city = 'Red Hook';
            return customer.secondaryAddresses[0].persistSave();
        }).then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (customer) {
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Red Hook');
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('Can get update conflicts', function () {
        var customer;
        var isStale = false;
        return Customer_1.Customer.getFromPersistWithId(sam._id).then(function (sam) {
            customer = sam;
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Red Hook');
            return knex('address').where({ '_id': customer.secondaryAddresses[0]._id }).update({ '__version__': 999 });
        }).then(function () {
            return customer.secondaryAddresses[0].isStale();
        }).then(function (stale) {
            isStale = stale;
            customer.secondaryAddresses[0].city = 'Red Hook';
            return customer.secondaryAddresses[0].persistSave();
        }).catch(function (e) {
            chai_1.expect(e.message).to.equal('Update Conflict');
            chai_1.expect(isStale).to.equal(true);
        });
    });
    it('Can transact', function () {
        var customer;
        var preSave = false;
        var dirtyCount = 0;
        return Customer_1.Customer.getFromPersistWithId(sam._id).then(function (c) {
            customer = c;
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Red Hook');
            customer.secondaryAddresses[0].city = 'Rhinebeck';
            customer.primaryAddresses[0].city = 'The Big Apple';
            var txn = PersistObjectTemplate.begin();
            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);
            txn.preSave = function () { preSave = true; };
            txn.postSave = function (txn) {
                dirtyCount = _.toArray(txn.savedObjects).length;
            }.bind(this);
            return PersistObjectTemplate.end(txn);
        }).then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (customer) {
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            chai_1.expect(customer.primaryAddresses[0].city).to.equal('The Big Apple');
            chai_1.expect(preSave).to.equal(true);
            chai_1.expect(dirtyCount).to.equal(2);
        }).catch(function (e) {
            throw e;
        });
    });
    it('Can get update conflicts on txn end and rollback', function () {
        var customer;
        var txn;
        return Customer_1.Customer.getFromPersistWithId(sam._id).then(function (c) {
            customer = c;
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            chai_1.expect(customer.primaryAddresses[0].city).to.equal('The Big Apple');
            customer.secondaryAddresses[0].city = 'Red Hook';
            customer.primaryAddresses[0].city = 'New York';
            txn = PersistObjectTemplate.begin();
            customer.secondaryAddresses[0].setDirty(txn);
            customer.primaryAddresses[0].setDirty(txn);
            return knex('address').where({ '_id': customer.primaryAddresses[0]._id }).update({ '__version__': 999 });
        }).then(function () {
            return PersistObjectTemplate.end(txn);
        }).catch(function (e) {
            chai_1.expect(e.message).to.equal('Update Conflict');
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (customer) {
            chai_1.expect(customer.secondaryAddresses[0].city).to.equal('Rhinebeck');
            chai_1.expect(customer.primaryAddresses[0].city).to.equal('The Big Apple');
        }).catch(function (e) {
            throw e;
        });
    });
    it('Two transactions can happen on the same connection pool', function (done) {
        var txn1 = PersistObjectTemplate.begin(true);
        var txn2 = PersistObjectTemplate.begin(true);
        var txn1Sam, txn2Karen;
        Promise.resolve().then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            txn1Sam = sam;
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            chai_1.expect(sam.firstName).to.equal('Sam');
            return Customer_1.Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            return Customer_1.Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            txn2Karen = karen;
            txn1Sam.firstName = 'txn1Sam';
            txn1Sam.setDirty(txn1);
            txn2Karen.firstName = 'txn2Karen';
            txn2Karen.setDirty(txn2);
            txn1.postSave = function () {
                return Promise.resolve()
                    .then(function () {
                    return Customer_1.Customer.getFromPersistWithId(sam._id);
                }).then(function (sam) {
                    chai_1.expect(sam.firstName).to.equal('Sam'); // Outside world does not see new value of sam
                    return PersistObjectTemplate.end(txn2); // Update Karen and end transaction txn2
                }).then(function () {
                    return Customer_1.Customer.getFromPersistWithId(sam._id);
                }).then(function (sam) {
                    chai_1.expect(sam.firstName).to.equal('Sam'); // Outside world still does not see new value of sam
                });
            };
            return PersistObjectTemplate.end(txn1); // Do update of sam but don't commit
        }).then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            chai_1.expect(sam.firstName).to.equal('txn1Sam');
            return Customer_1.Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            chai_1.expect(karen.firstName).to.equal('txn2Karen');
            done();
        }).catch(function (err) {
            done(err);
        });
    });
    it('Can get a deadlock rollback', function (done) {
        /* Sequence to get a deadlock:
        1 - txn1 - end() procssesing: update sam (acquire exclusive lock)
        2 - txn2 - end() processing: update karen (aquire exclusive lock), update sam (request lock on sam),
        3 - txn1 - postSave processing: update karen (request exclusive lock that can't be granted   */
        var txn1 = PersistObjectTemplate.begin(true);
        var txn2 = PersistObjectTemplate.begin(true);
        var txn1Sam, txn1Karen, txn2Sam, txn2Karen;
        var txn1Error = false;
        var txn2Error = false;
        Promise.resolve()
            .then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            txn1Sam = sam;
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            txn2Sam = sam;
            chai_1.expect(sam.firstName).to.equal('txn1Sam');
            return Customer_1.Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            txn1Karen = karen;
            return Customer_1.Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            txn2Karen = karen;
            txn1Sam.firstName = 'txn1SamDead';
            txn1Sam.setDirty(txn1);
            txn2Karen.firstName = 'txn2KarenDead';
            txn2Karen.setDirty(txn2);
            txn2Sam.firstName = 'txn2SamDead';
            txn2Sam.setDirty(txn2);
            txn1.postSave = function () {
                Promise.delay(100)
                    .then(function () {
                    // Update will not return because it is requesting a lock on Karen
                    txn1Karen.persistTouch(txn1) // 3 update karen
                        .catch(function (e) {
                        if (e.message != 'Update Conflict')
                            done(e);
                        txn2Error = true;
                    });
                });
                // Update will not return because it is requesting a lock on Sam
                return PersistObjectTemplate.end(txn2) // 2 - update sam (req lock), update karen (exc lock)
                    .catch(function (e) {
                    chai_1.expect(e.message).to.equal('Update Conflict');
                    txn2Error = true;
                });
            };
            return PersistObjectTemplate.end(txn1); // 1 - update sam (exc lock)
        }).catch(function (e) {
            if (e.message != 'Update Conflict')
                done(e);
            chai_1.expect(e.message).to.equal('Update Conflict');
            txn1Error = true;
        }).then(function () {
            chai_1.expect((txn1Error ? 1 : 0) + (txn2Error ? 1 : 0)).to.equal(1);
            chai_1.expect(!!(txn1.innerError || txn2.innerError).toString().match(/deadlock/)).to.equal(true);
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (sam) {
            chai_1.expect(sam.firstName).to.equal(txn1Error ? 'txn1Sam' : 'txn1SamDead'); // Failed
            return Customer_1.Customer.getFromPersistWithId(karen._id);
        }).then(function (karen) {
            chai_1.expect(karen.firstName).to.equal(txn2Error ? 'txn2Karen' : 'txn2KarenDead'); // Survived (Not sure order will always be the same
            done();
        }).catch(function (err) {
            done(err);
        });
    });
    it('Can change things to null', function (done) {
        Customer_1.Customer.getFromPersistWithId(sam._id, { roles: true, referredBy: true }).then(function (customer) {
            customer.firstName = null;
            customer.referredBy = null;
            return customer.persistSave();
        }).then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id, { roles: true, referredBy: true });
        }).then(function (customer) {
            chai_1.expect(customer.firstName).to.equal(null);
            chai_1.expect(customer.referredBy).to.equal(null);
            done();
        }.bind(this)).catch(function (e) {
            done(e);
        });
    });
    it('cascadeSave with transaction', function () {
        var txn = PersistObjectTemplate.begin();
        var customerForCascadeSave = new Customer_1.Customer('customerForCascadeSave', 'M', 'Last');
        customerForCascadeSave.cascadeSave(txn);
        return PersistObjectTemplate.end(txn).then(function () {
            return Customer_1.Customer.getFromPersistWithId(customerForCascadeSave._id);
        }).then(function (customer) {
            chai_1.expect(customer.firstName).to.equal('customerForCascadeSave');
        }.bind(this)).catch(function (e) {
            throw e;
        });
    });
    it('cascadeSave without transaction', function () {
        var txn = PersistObjectTemplate.begin();
        var customerForCascadeSave = new Customer_1.Customer('customerForCascadeSaveWithoutTransaction', 'M', 'Last');
        customerForCascadeSave.cascadeSave(txn);
        return PersistObjectTemplate.end().then(function () {
            return Customer_1.Customer.getFromPersistWithId(customerForCascadeSave._id);
        }).then(function (customer) {
            chai_1.expect(customer.firstName).to.equal('customerForCascadeSaveWithoutTransaction');
        }.bind(this)).catch(function (e) {
            throw e;
        });
    });
    it('Can prune orphans', function (done) {
        Customer_1.Customer.getFromPersistWithId(sam._id).then(function (customer) {
            customer.secondaryAddresses = [];
            return customer.persistSave();
        }).then(function () {
            return Customer_1.Customer.getFromPersistWithId(sam._id);
        }).then(function (customer) {
            chai_1.expect(customer.secondaryAddresses.length).to.equal(0);
            done();
        }).catch(function (e) {
            done(e);
        });
    });
    it('can delete', function (done) {
        Customer_1.Customer.getFromPersistWithQuery({}, { roles: { fetch: { account: true } } }).then(function (customers) {
            function deleteStuff(txn) {
                var promises = [];
                customers.forEach(function (customer) {
                    customer.roles.forEach(function (role) {
                        var account = role.account;
                        account.roles.forEach(function (role) {
                            promises.push(role.persistDelete(txn));
                            promises.push(role.account.persistDelete(txn));
                        });
                    });
                    promises.push(customer.persistDelete());
                });
                return Promise.all(promises);
            }
            var txn = PersistObjectTemplate.begin();
            txn.preSave = deleteStuff;
            return PersistObjectTemplate.end(txn).then(function () {
                return Customer_1.Customer.countFromPersistWithQuery();
            }).then(function (count) {
                chai_1.expect(count).to.equal(0);
                return Account_1.Account.countFromPersistWithQuery();
            }).then(function (count) {
                chai_1.expect(count).to.equal(0);
                return Role_1.Role.countFromPersistWithQuery();
            }).then(function (count) {
                chai_1.expect(count).to.equal(0);
                done();
            });
        }).catch(function (e) { done(e); });
    });
    // it('closes the database', function (done) {
    //     persist_banking_pgsql.js.close().then(function () {
    //         console.log('ending banking');
    //         done()
    //     });
    // });
});
//# sourceMappingURL=persist_banking_pgsql.js.map