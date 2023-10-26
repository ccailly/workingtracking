import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	updateStatusBarItem(context);

	let disposableQuickPick = vscode.commands.registerCommand('working-tracking.quickPick', () => {
		const items: vscode.QuickPickItem[] = [
			{
				label: 'Définir heure d\'arrivée',
				description: 'Définir votre heure d\'arrivée'
			},
			{
				label: 'Définir heure de début de pause',
				description: 'Définir votre heure de début de pause'
			},
			{
				label: 'Définir heure de fin de pause',
				description: 'Définir votre heure de fin de pause'
			},
			{
				label: 'Démarrer une pause',
				description: 'Démarrer une pause'
			},
			{
				label: 'Terminer la dernière pause',
				description: 'Terminer la dernière pause'
			},
			{
				label: 'Ouvrir le dashboard',
				description: 'Ouvrir le dashboard'
			}
		];

		vscode.window.showQuickPick(items).then((item) => {
			if (item) {
				switch (item.label) {
					case 'Définir heure d\'arrivée':
						vscode.commands.executeCommand('working-tracking.setArrivalTime');
						break;
					case 'Définir heure de début de pause':
						vscode.commands.executeCommand('working-tracking.setLunchStartTime');
						break;
					case 'Définir heure de fin de pause':
						vscode.commands.executeCommand('working-tracking.setLunchEndTime');
						break;
					case 'Démarrer une pause':
						vscode.commands.executeCommand('working-tracking.startBreak');
						break;
					case 'Terminer la dernière pause':
						vscode.commands.executeCommand('working-tracking.endBreak');
						break;
					case 'Ouvrir le dashboard':
						vscode.commands.executeCommand('working-tracking.openDashboard');
						break;
				}
			}
		});
	});

	let disposableArrival = vscode.commands.registerCommand('working-tracking.setArrivalTime', () => {
		vscode.window.showInputBox({ prompt: "Entrez votre heure d'arrivée (format HH:mm)" }).then((input) => {
			if (input) {
				let date = new Date();
				date.setHours(input?.split(':')[0] as any);
				date.setMinutes(input?.split(':')[1] as any);
				date.setSeconds(0);

				setDailyArrival(context, date.getTime());
				updateStatusBarItem(context);
				vscode.window.showInformationMessage('Votre heure d\'arrivée a été redéfinie à ' + date.toLocaleTimeString());
			}
		});
	});

	let disposableLunchStart = vscode.commands.registerCommand('working-tracking.setLunchStartTime', () => {
		vscode.window.showInputBox({ prompt: "Entrez votre heure de début de pause (format HH:mm)" }).then((input) => {
			if (input) {
				let date = new Date();
				date.setHours(input?.split(':')[0] as any);
				date.setMinutes(input?.split(':')[1] as any);
				date.setSeconds(0);

				setLunchStart(context, date.getTime());
				updateStatusBarItem(context);
				vscode.window.showInformationMessage('Votre heure de début de pause a été redéfinie à ' + date.toLocaleTimeString());
			}
		});
	});

	let disposableLunchEnd = vscode.commands.registerCommand('working-tracking.setLunchEndTime', () => {
		vscode.window.showInputBox({ prompt: "Entrez votre heure de fin de pause (format HH:mm)" }).then((input) => {
			if (input) {
				let date = new Date();
				date.setHours(input?.split(':')[0] as any);
				date.setMinutes(input?.split(':')[1] as any);
				date.setSeconds(0);

				setLunchEnd(context, date.getTime());
				updateStatusBarItem(context);
				vscode.window.showInformationMessage('Votre heure de fin de pause a été redéfinie à ' + date.toLocaleTimeString());
			}
		});
	});

	let disposableStartBreak = vscode.commands.registerCommand('working-tracking.startBreak', () => {
		startBreak(context);
		updateStatusBarItem(context);
		vscode.window.showInformationMessage('Votre pause a été démarrée');
	});

	let disposableEndBreak = vscode.commands.registerCommand('working-tracking.endBreak', () => {
		endBreak(context);
		updateStatusBarItem(context);
		vscode.window.showInformationMessage('Votre pause a été terminée');
	});

	const updateInterval = setInterval(() => {
		updateStatusBarItem(context);
	}, 1000 * 60);
	context.subscriptions.push(disposableQuickPick, disposableArrival, disposableLunchStart, disposableLunchEnd, disposableStartBreak, disposableEndBreak);
	context.subscriptions.push(statusBarItem);

	// Push the interval to the subscriptions so it gets cleared on deactivation
	context.subscriptions.push({ dispose: () => clearInterval(updateInterval) });
}

export function deactivate(context: vscode.ExtensionContext) {
	// Clear the interval on deactivation
	context.subscriptions.forEach((subscription) => {
		subscription.dispose();
	});

	// Set departure time
	setDeparture(context);
}

/**
 * Update the status bar item
 *
 * @param context
 */
function updateStatusBarItem(context: vscode.ExtensionContext) {
	const dailyArrival = getDailyArrival(context);

	let arrival = new Date(dailyArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	let dailyDeparture = getDailyDeparture(context);
	let lunchDuration = getLunchDuration(context);
	let timeLeft = dailyDeparture - Date.now() + lunchDuration;

	let sign = timeLeft < 0 ? '+' : '';
	timeLeft = Math.abs(timeLeft);
	let hours = Math.floor(timeLeft / (60 * 60 * 1000));
	let minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

	// Compute status bar background color
	// if (timeLeft !== null && timeLeft < 0) {
	// 	statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.debuggingBackground');
	// } else if (getLunchEnd(context) === undefined) {
	// 	statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	// } else {
	// 	statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.background');
	// }

	statusBarItem.text = '$(timeline-open) ' + sign + hours + ' hrs ' + minutes + ' mins';
	statusBarItem.command = 'working-tracking.quickPick';
	statusBarItem.tooltip = 'Work since ' + arrival + ' today - Click to open Quick Pick';
	statusBarItem.show();
}

/**
 * Return the daily departure time in milliseconds
 * Actually, it's the arrival time + 8 hours
 *
 * @param context
 */
function getDailyDeparture(context: vscode.ExtensionContext) {
	const dailyArrival = getDailyArrival(context);
	return dailyArrival + 7 * 60 * 60 * 1000;
}

/**
 * Return the lunch duration in milliseconds
 *
 * @param context
 * @return number The lunch duration in milliseconds
 */
function getLunchDuration(context: vscode.ExtensionContext) {
	const lunchStart = getLunchStart(context);
	const lunchEnd = getLunchEnd(context);
	if (lunchStart && lunchEnd) {
		return lunchEnd - lunchStart;
	}

	return 60 * 60 * 1000; // default to 1 hour
}

interface DailyData {
	arrival: number;
	departure: number | null;
	lunchStart: number | null;
	lunchEnd: number | null;
	breaks: Break[];
}

interface Break {
	start: number;
	end: number | null;
}

/**
 * Return the daily data
 *
 * @param context
 * @return DailyData
 */
function getTodayData(context: vscode.ExtensionContext): DailyData {
	const todayData = context.globalState.get<DailyData>(new Date().toLocaleDateString());
	if (todayData) {
		return todayData;
	}

	const defaultData: DailyData = {
		arrival: Date.now(),
		departure: null,
		lunchStart: null,
		lunchEnd: null,
		breaks: []
	};

	context.globalState.update(new Date().toLocaleDateString(), defaultData);
	return defaultData;
}

/**
 * Set the daily arrival time
 *
 * @param context
 * @param arrivalTime
 */
function setDailyArrival(context: vscode.ExtensionContext, arrivalTime?: number) {
	const todayData = getTodayData(context);
	todayData.arrival = arrivalTime || Date.now();
	context.globalState.update(new Date().toLocaleDateString(), todayData);
}

/**
 * Set the daily departure time
 *
 * @param context
 * @param departureTime
 */
function setDeparture(context: vscode.ExtensionContext, departureTime?: number) {
	const todayData = getTodayData(context);
	todayData.departure = departureTime || Date.now();
	context.globalState.update(new Date().toLocaleDateString(), todayData);
}

/**
 * Set the lunch start time
 *
 * @param context
 * @param lunchStart
 */
function setLunchStart(context: vscode.ExtensionContext, lunchStart: number) {
	const todayData = getTodayData(context);
	todayData.lunchStart = lunchStart;
	context.globalState.update(new Date().toLocaleDateString(), todayData);
}

/**
 * Set the lunch end time
 *
 * @param context
 * @param lunchEnd
 */
function setLunchEnd(context: vscode.ExtensionContext, lunchEnd: number) {
	const todayData = getTodayData(context);
	todayData.lunchEnd = lunchEnd;
	context.globalState.update(new Date().toLocaleDateString(), todayData);
}

/**
 * Return the daily departure time
 *
 * @param context
 * @returns
 */
function getDailyArrival(context: vscode.ExtensionContext) {
	return getTodayData(context).arrival;
}

/**
 * Return the daily departure time
 *
 * @param context
 * @returns
 */
function getLunchStart(context: vscode.ExtensionContext) {
	return getTodayData(context).lunchStart;
}

/**
 * Return the daily departure time
 *
 * @param context
 * @returns
 */
function getLunchEnd(context: vscode.ExtensionContext) {
	return getTodayData(context).lunchEnd;
}

/**
 * Start a break
 *
 * @param context
 */
function startBreak(context: vscode.ExtensionContext) {
	const todayData = getTodayData(context);
	todayData.breaks.push({ start: Date.now(), end: null });
	context.globalState.update(new Date().toLocaleDateString(), todayData);
}

/**
 * End the last break
 *
 * @param context
 */
function endBreak(context: vscode.ExtensionContext) {
	const todayData = getTodayData(context);
	const lastBreak = todayData.breaks.pop();
	if (lastBreak && lastBreak.end === null) {
		lastBreak.end = Date.now();
		todayData.breaks.push(lastBreak);
		context.globalState.update(new Date().toLocaleDateString(), todayData);
	}
}
