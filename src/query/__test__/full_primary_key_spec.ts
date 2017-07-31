import * as chai from 'chai';
const expect = chai.expect;

import { Table } from '../../table';
import * as Metadata from '../../metadata';

import { FullPrimaryKey } from '../full_primary_key';

import { createTable } from '../create_table';
import { dropTable } from '../drop_table';

import { createClient, createDocumentClient } from '../../dynamo-client';

class Card extends Table {
  public id: number;
  public title: string;
}

(Card as any).metadata = {
  name: "Card",
  attributes: [
    {
      name: 'id',
      type: Metadata.Attribute.Type.Number,
    }, {
      name: 'title',
      type: Metadata.Attribute.Type.String,
    },
  ],
  primaryKey: {
    type: 'FULL',
    hash: {
      name: 'id',
      type: Metadata.Attribute.Type.Number,
    },
    range: {
      name: 'title',
      type: Metadata.Attribute.Type.String,
    }
  }
};

describe("FullPrimaryKey", () => {
  let primaryKey: FullPrimaryKey<Card, number, string>;
  const client = createClient();
  const documentClient = createDocumentClient();

  beforeEach(async() => {
    await createTable(Card.metadata, client);

    primaryKey = new FullPrimaryKey<Card, number, string>(
      Card,
      Card.metadata.primaryKey as Metadata.Indexes.FullPrimaryKeyMetadata,
      documentClient
    );
  });

  afterEach(async () => {
    await dropTable(Card.metadata, client);
  });

  describe("#get", async () => {
    it("should find item", async () => {
      const item = await primaryKey.get(10, "abc");
      expect(item).to.be.null;
    });

    it("should find item", async () => {
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();
      const item = await primaryKey.get(10, "abc");
      expect(item).to.be.instanceof(Card);
      expect(item!.id).to.eq(10);
      expect(item!.title).to.eq("abc");
    });
  });

  describe("#bacthGet", async () => {
    it("should find items", async () => {
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 11,
          title: "abc",
        }
      }).promise();
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 12,
          title: "abc",
        }
      }).promise();

      const items = (await primaryKey.batchGet([ [10, "abc"], [11, "abc"] ])).records;
      expect(items.length).to.eq(2);
      expect(items[0].id).to.eq(10);
      expect(items[1].id).to.eq(11);
    });
  });


  describe("#query", () => {
    it("should find items", async () => {
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abd",
        }
      }).promise();
      await documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "aba",
        }
      }).promise();

      const res = await primaryKey.query({
        hash: 10,
        range: ["between", "abc", "abf"]
      });

      console.log(res);
      expect(res.records.length).to.eq(2);
      expect(res.records[0].title).to.eq("abc");
      expect(res.records[1].title).to.eq("abd");
    });
  });
});