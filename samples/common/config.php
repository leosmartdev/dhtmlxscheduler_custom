<?php

	require_once(dirname(__FILE__).'/connector/db_sqlite3.php');
	
	// SQLite
	$dbtype = "SQLite3";
	$res = new SQLite3(dirname(__FILE__)."/database.sqlite");

	// Mysql
	// $dbtype = "MySQL";
	// $res=mysql_connect("192.168.1.251", "scheduler", "scheduler");
	// mysql_select_db("schedulertest");

	// PDO
	// require_once (dirname(__FILE__)."/connector/db_pdo.php");
	// $res = new PDO("mysql:host=192.168.1.251;dbname=schedulertest", "scheduler", "scheduler");
	// $dbtype = "PDO";

	// MySQLi
	// require_once (dirname(__FILE__)."/connector/db_mysqli.php");
	// $res = new mysqli("192.168.1.251", "scheduler", "scheduler", "schedulertest");
	// $dbtype = "MySQLi";
?>