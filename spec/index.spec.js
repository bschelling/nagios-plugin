'use strict';
Object.defineProperty(Array.prototype, 'indexOfObject', {
	enumerable : false,
	value : function(property, value) {
		for ( var i = 0, len = this.length; i < len; i++) {
			if (this[i][property] === value) {
				return i;
			}
		}
		return -1;
	}
});

function hookStdout(callback) {
	var oldWrite = process.stdout.write;
	// jshint unused: false
	process.stdout.write = (function(write) {
		return function(string, encoding, fd) {
			// write.apply(process.stdout, arguments);
			callback(string, encoding, fd);
		};
	})(process.stdout.write);

	return function() {
		process.stdout.write = oldWrite;
	};
}

describe('lib/index.js', function() {
	var F;
	F = require('../lib/index');
	var outStr, unhook, o;
	beforeEach(function() {
		o = new F({
			a : 'pass',
			usage : 'Usage: ...',
			version : '0.0.1'
		});
		outStr = '';
		unhook = hookStdout(function(string) {
			outStr += string;
		});
		spyOn(process, 'exit');
	});
	afterEach(function() {
		unhook();
	});

	it('should define functions', function() {
		expect(o.setThresholds).toBeDefined();
		expect(o.checkThreshold).toBeDefined();
		expect(o.addMessage).toBeDefined();
		expect(o.checkMessages).toBeDefined();
		expect(o.addPerfData).toBeDefined();
		expect(o.getReturnMessage).toBeDefined();
		expect(o.nagiosExit).toBeDefined();
	});

	describe('invoked with no arguments,', function() {
		it('calls method setThresholds() twice', function() {
			o.setThresholds({
				'critical' : 60,
				'warning' : 15
			});
			o.setThresholds({
				'warning' : 16
			});
			expect(o.threshold.critical).toBe(60);
			expect(o.threshold.warning).toBe(16);
		});

		it('calls method checkThreshold()', function() {
			o.setThresholds({
				'critical' : 60,
				'warning' : 15
			});
			var state = o.checkThreshold(61);
			expect(state).toBe(o.states.CRITICAL);
		});
		it('calls methods addMessage() then checkMessages()', function() {
			o.addMessage(o.states.CRITICAL, 'sky falling');
			var messageObj = o.checkMessages();
			expect(messageObj.message).toContain('sky falling');
		});

		describe('calls methods setThresholds() then addPerfdata()', function() {
			beforeEach(function() {
				o.setThresholds({
					'critical' : 60,
					'warning' : 15
				});
				o.addPerfData({
					label : 'time',
					value : 15,
					uom : 's',
					threshold : o.threshold
				});
			});
			it('', function() {
				expect(o.perfData[o.perfData.indexOfObject('label', 'time')].uom).toBe(
						's');
			});
			describe('then getReturnMessage()', function() {
				var msg;
				beforeEach(function() {
					msg = o.getReturnMessage(2, 'failure');
				});
				it('', function() {
					expect(msg).toContain('CRITICAL - failure|time=15s;15;60');
				});
				it('then nagiosExit()', function() {
					o.nagiosExit(2, 'failure');
					expect(process.exit).toHaveBeenCalledWith(2);
					expect(outStr.trim()).toBe(msg);
				});
			});
		});
	});
});
