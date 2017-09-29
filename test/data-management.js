const chai = require('chai');
const expect = chai.expect;
const sinon  = require('sinon');

const kindOfRegularResponse = require('./fake-api/kind-of-regular-response.json');

const SuperRepo = require('../lib/index.js');

describe('Data Management', () => {
    var repository;

    before(() => {
        repository = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 3 * 1000, // 3 seconds
            request: () => new Promise(resolve => resolve(kindOfRegularResponse))
        });
    });

    it('Should resolve to the server-side data', done => {
        repository.getData().then( result => {
            expect(result).to.equal(kindOfRegularResponse);
        }).then(done, done);
    });

    it('Should resolve the same data, no matter if it is taken from cache or from a network request', done => {
        repository.getData().then( () => {
            repository.getData().then( () => {

                repository.getData().then( result => {
                    expect(result).to.equal(kindOfRegularResponse);
                }).then(done, done);
            });
        });
    });

    it('Should do a network request only once', done => {
        var networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve(kindOfRegularResponse));
            }
        });

        repo.getData().then( () => {
            repo.getData().then( () => {

                repo.getData().then( result => {
                    expect(networkRequestsCount).to.equal(1);
                }).then(done, done);

            });
        });
    });

    it('Should initiate a network request every time.', done => {
        let networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: -1,
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => resolve('whatever'));
            }
        });

        repo.getData().then( () => {
            repo.getData().then( () => {
                repo.getData().then(() => {
                    repo.getData().then( result => {
                        expect(networkRequestsCount).to.equal(4);
                    }).then(done, done);
                });
            });
        });
    });

    it('Should wait if there is a Promise pending and should NOT fire another one', done => {
        const clock = sinon.useFakeTimers();
        let networkRequestsCount = 0;

        const repo = new SuperRepo({
            storage: 'LOCAL_VARIABLE',
            name: 'test',
            outOfDateAfter: 60 * 1000, // 1 min
            request: () => {
                networkRequestsCount++;

                return new Promise(resolve => {
                    clock.tick(10000);
                    resolve(kindOfRegularResponse);

                    clock.restore();
                });
            }
        });

        repo.getData();
        repo.getData();
        repo.getData();

        repo.getData().then( result => {
            expect(networkRequestsCount).to.equal(1);
        }).then(done, done);
    });

    it('Should clear the currently cached data.', done => {
        repository.getData().then( () => {
            repository.clearData().then(() => {
                expect(repository.data).to.equal(null);
            }).then(done, done);
        });
    });

    it('Should return the previous data when the currently cached data is cleared', done => {
        repository.getData().then( () => {
            repository.clearData().then(prevData => {
                // TODO: More complex process.
                expect(prevData.data).to.equal(kindOfRegularResponse);
            }).then(done, done);
        });
    });

    it('Should have up to date data.', done => {
        repository.getData().then( () => {
            repository.getDataUpToDateStatus().then(_res => {
                expect(_res.isDataUpToDate).to.equal(true);
            }).then(done, done);
        });
    });

    it('Should invalidate the data.', done => {
        repository.getData().then( () => {
            repository.invalidateData().then( () => {
                repository.getDataUpToDateStatus().then(_res => {
                    expect(_res.isDataUpToDate).to.equal(false);
                }).then(done, done);
            });
        });
    });
});
