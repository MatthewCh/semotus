import {Supertype, supertypeClass, property} from '../../index';
import {Account} from './Account';

@supertypeClass
export class Transaction  extends Supertype {
    constructor (account, type, amount) {
        super()
        this.account = account;
        this.type = type;
        this.amount = amount;
        if (account)
            account.transactions.push(this);
    };

    @property()
    amount: number;

    @property()
    type: string;

    @property({getType: () => {return Account}})
    account: Account;
}

export class Debit extends Transaction {
    constructor (account, type, amount) {
        super(account, type, amount);
    }
}

export class Credit extends Transaction {
    constructor (account, type, amount) {
        super(account, type, amount);
    }
}

export class Xfer extends Transaction {

    @property({fetch: true})
    fromAccount: Account;

    constructor (account, type, amount, fromAccount) {
        super(account, type, amount);
        this.fromAccount = fromAccount;
        if (fromAccount)
            fromAccount.fromAccountTransactions.push(this);
    }
}
