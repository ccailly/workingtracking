import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	updateStatusBarItem(context);

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

				context.globalState.update(
					new Date().toLocaleDateString() + '-lunch-start',
					date.getTime()
				);
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

				context.globalState.update(
					new Date().toLocaleDateString() + '-lunch-end',
					date.getTime()
				);
				updateStatusBarItem(context);
				vscode.window.showInformationMessage('Votre heure de fin de pause a été redéfinie à ' + date.toLocaleTimeString());
			}
		});
	});

	const updateInterval = setInterval(() => {
		updateStatusBarItem(context);
	}, 1000 * 60);
	context.subscriptions.push(disposableArrival, disposableLunchStart, disposableLunchEnd);
	context.subscriptions.push(statusBarItem);

	// Push the interval to the subscriptions so it gets cleared on deactivation
    context.subscriptions.push({ dispose: () => clearInterval(updateInterval) });
}

export function deactivate() { }

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

	statusBarItem.text = '$(timeline-open) ' + sign + hours + ' hrs ' + minutes + ' mins';
	statusBarItem.command = 'working-tracking.openDashboard';
	statusBarItem.tooltip = 'Work since ' + arrival + ' today - Click to visit dashboard';
	statusBarItem.show();
}

/**
 * Return the daily arrival time in milliseconds
 *
 * @param context
 * @return number The daily arrival time in milliseconds
 */
function getDailyArrival(context: vscode.ExtensionContext) {
	const dailyArrival = context.globalState.get(new Date().toLocaleDateString());
	if (dailyArrival && typeof dailyArrival === 'number') {
		return dailyArrival;
	}

	return setDailyArrival(context)
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
 * Set the daily arrival time in milliseconds
 *
 * @param context
 * @return number The daily arrival time in milliseconds
 */
function setDailyArrival(context: vscode.ExtensionContext, arrivalTime?: number) {
    if (!arrivalTime) {
        arrivalTime = Date.now();
    }

	context.globalState.update(
		new Date().toLocaleDateString(),
		new Date(arrivalTime).getTime()
	);
	return Date.now();
}

/**
 * Return the lunch duration in milliseconds
 *
 * @param context
 * @return number The lunch duration in milliseconds
 */
function getLunchDuration(context: vscode.ExtensionContext) {
	const lunchStart = context.globalState.get('lunchStart');
	const lunchEnd = context.globalState.get('lunchEnd');
	if (lunchStart && lunchEnd) {
		return (lunchEnd as number) - (lunchStart as number);
	}

	return 60 * 60 * 1000; // default to 1 hour
}
