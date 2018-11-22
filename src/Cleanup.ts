type Message = { [key: string]: string }
type Signals =
        "SIGABRT" | "SIGALRM" | "SIGBUS" | "SIGCHLD" | "SIGCONT" | "SIGFPE" | "SIGHUP" | "SIGILL" | "SIGINT" | "SIGIO" |
        "SIGIOT" | "SIGKILL" | "SIGPIPE" | "SIGPOLL" | "SIGPROF" | "SIGPWR" | "SIGQUIT" | "SIGSEGV" | "SIGSTKFLT" |
        "SIGSTOP" | "SIGSYS" | "SIGTERM" | "SIGTRAP" | "SIGTSTP" | "SIGTTIN" | "SIGTTOU" | "SIGUNUSED" | "SIGURG" |
        "SIGUSR1" | "SIGUSR2" | "SIGVTALRM" | "SIGWINCH" | "SIGXCPU" | "SIGXFSZ" | "SIGBREAK" | "SIGLOST" | "SIGINFO";
type SignalsListener = (signal: Signals) => void;

export type CleanupHandler =  (exitCode: number | null, signal: Signals | null) => boolean;

export default class Cleanup {
    /******************************************************************************
    nodeCleanup() installs functions -- cleanup handlers -- that perform cleanup activities just before the node process exits, except on SIGKILL, which can't be intercepted. nodeCleanup() can also install messages to be written to stderr on either SIGINT or an uncaught exception.
    Each cleanup handler has the following (FlowType) signature:
        cleanupHandler(exitCode: number|null, signal: string|null): boolean?
    If the process is terminating for a reason other than a signal, exitCode is an integer that provides the reason for termination, and signal is null. If the process received a POSIX signal, signal is the signal's string name, and exitCode is null. These are also the arguments passed to a process' `exit` event handler, mirrored in node-cleanup for consistency.
    The process terminates after cleanup, except possibly on signals. If any cleanup handler returns a boolean false for a signal, the process will not exit; otherwise the process exits. SIGKILL cannot be intercepted.
    Install a cleanup handler as follows:
        var nodeCleanup = require('node-cleanup');
        nodeCleanup(cleanupHandler, stderrMessages);
        
    Or to only install stderr messages:
        nodeCleanup(stderrMessages);
    Or to install the default stderr messages:
        nodeCleanup();
    nodeCleanup() may be called multiple times to install multiple cleanup handlers. However, only the most recently installed stderr messages get used. The messages available are ctrl_C and uncaughtException.
    The following uninstalls all cleanup handlers and may be called multiple times in succession:
        nodeCleanup.uninstall();
    This module has its origin in code by  @CanyonCasa at  http://stackoverflow.com/a/21947851/650894, but the module was significantly rewritten to resolve issues raised by @Banjocat at http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits#comment68567869_21947851. It has also been extended for greater configurability.
    ******************************************************************************/
    
    //// CONSTANTS ////////////////////////////////////////////////////////////////

    private static DEFAULT_MESSAGES: Message = {
        ctrl_C: '[ctrl-C]',
        uncaughtException: 'Uncaught exception...'
    };
    
    //// CONFIGURATION ////////////////////////////////////////////////////////////

    private CleanupHandlers: Array<CleanupHandler> = []; // array of cleanup handlers to call
    private Messages: Message | undefined; // messages to write to stderr

    private sigintHandler: SignalsListener | undefined;
    private sighupHandler: SignalsListener | undefined;
    private sigquitHandler: SignalsListener | undefined;
    private sigtermHandler: SignalsListener | undefined;

    //// HANDLERS /////////////////////////////////////////////////////////////////

    private signalHandler(signal: any) {
        var exit = true;
        this.CleanupHandlers.forEach((cleanup) => {
            if (cleanup(null, signal) === false)
                exit = false;
        });
        if (exit) {
            if (signal === 'SIGINT' && this.Messages && this.Messages.ctrl_C !== '')
                process.stderr.write(this.Messages.ctrl_C + "\n");
            this.uninstall(); // don't cleanup again
            // necessary to communicate the signal to the parent process
            process.kill(process.pid, signal);
        }
    }

    private exceptionHandler(e: Error) {
        if (this.Messages && this.Messages.uncaughtException !== '')
            process.stderr.write(this.Messages.uncaughtException + "\n");
        process.stderr.write(e.stack + "\n");
        process.exit(1); // will call exitHandler() for cleanup
    }

    private exitHandler(exitCode: number) {
        this.CleanupHandlers.forEach((cleanup) => {
            cleanup(exitCode, null);
        });
    }

    //// MAIN /////////////////////////////////////////////////////////////////////

    public constructor(private cleanupHandler?: CleanupHandler, private stderrMessages?: any) {
        if (this.cleanupHandler) {
            if (typeof this.cleanupHandler === 'object') {
                this.stderrMessages = this.cleanupHandler;
                this.cleanupHandler = undefined;
            }
        }
        else if (!this.stderrMessages)
            this.stderrMessages = Cleanup.DEFAULT_MESSAGES;
        
        if (this.stderrMessages) {
            if (this.Messages === null)
                this.Messages = { ctrl_C: '', uncaughtException: '' };
            if (typeof stderrMessages.ctrl_C === 'string')
                this.Messages = { ctrl_C: stderrMessages.ctrl_C };
            if (typeof stderrMessages.uncaughtException === 'string')
                this.Messages = { uncaughtException: stderrMessages.uncaughtException };
        }
        
        if (this.CleanupHandlers.length == 0) {
            this.CleanupHandlers = []; // establish before installing handlers
            
            //this.sigintHandler   = this.signalHandler.bind(this, 'SIGINT');
            this.sighupHandler   = this.signalHandler.bind(this, 'SIGHUP');
            this.sigquitHandler  = this.signalHandler.bind(this, 'SIGQUIT');
            this.sigtermHandler  = this.signalHandler.bind(this, 'SIGTERM');
            
            //process.on('SIGINT',    this.sigintHandler!.bind(this));
            process.on('SIGHUP',    this.sighupHandler!.bind(this));
            process.on('SIGQUIT',   this.sigquitHandler!.bind(this));
            process.on('SIGTERM',   this.sigtermHandler!.bind(this));
            process.on('uncaughtException', this.exceptionHandler.bind(this));
            process.on('exit',      this.exitHandler.bind(this));

            this.CleanupHandlers.push(cleanupHandler || this.noCleanup);
        }
        else if (cleanupHandler) {
            this.CleanupHandlers.push(cleanupHandler);
        }
    }

    public uninstall() {
        if (this.CleanupHandlers.length > 0) {
            //process.removeListener('SIGINT', this.sigintHandler!);
            process.removeListener('SIGHUP', this.sighupHandler!);
            process.removeListener('SIGQUIT', this.sigquitHandler!);
            process.removeListener('SIGTERM', this.sigtermHandler!);
            process.removeListener('uncaughtException', this.exceptionHandler);
            process.removeListener('exit', this.exitHandler);
            this.CleanupHandlers = []; // null only after uninstalling
        }
    }

    private noCleanup() {
        return true; // signals will always terminate process
    }

    //// EXPORTS //////////////////////////////////////////////////////////////////
}

