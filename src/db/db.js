import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pgPool = new Pool({
    connectionString: process.env.DB_URL,
})

const MYSQL_TO_PG_DATE_FORMATS = {
    '%Y-%m-%d': 'YYYY-MM-DD',
    '%b %d, %Y': 'Mon DD, YYYY',
    '%b %d': 'Mon DD',
    '%d %b %Y': 'DD Mon YYYY',
    '%h:%i %p': 'HH12:MI AM',
}

const getPrimaryKeyColumn = (sql) => {
    const match = sql.match(/insert\s+into\s+([a-z_]+)/i)
    const table = match?.[1]?.toLowerCase()

    if (table === 'teachers') return 'teacher_id'
    if (table === 'students') return 'student_id'
    return 'id'
}

const appendReturning = (sql) => {
    if (!/^\s*insert\s+into/i.test(sql) || /\breturning\b/i.test(sql)) return sql
    return `${sql.trim()} RETURNING ${getPrimaryKeyColumn(sql)}`
}

const convertDateFunctions = (sql) => {
    let converted = sql
        .replace(/DATE_SUB\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+1\s+DAY\s*\)/gi, "(CURRENT_DATE - INTERVAL '1 day')")
        .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')

    const convertFormat = (_match, fn, expr, mysqlFormat) => {
        const pgFormat = MYSQL_TO_PG_DATE_FORMATS[mysqlFormat] || mysqlFormat
        return `to_char(${expr.trim()}, '${pgFormat}')`
    }

    converted = converted
        .replace(/(DATE_FORMAT)\(\s*([^,]+?)\s*,\s*'([^']+)'\s*\)/gi, convertFormat)
        .replace(/(TIME_FORMAT)\(\s*([^,]+?)\s*,\s*'([^']+)'\s*\)/gi, convertFormat)

    return converted
}

const convertPlaceholders = (sql, params = []) => {
    const values = []
    let index = 1
    let paramIndex = 0

    const text = sql.replace(/\?/g, () => {
        const value = params[paramIndex++]

        if (Array.isArray(value) && Array.isArray(value[0])) {
            const rows = value.map(row => {
                const placeholders = row.map(cell => {
                    values.push(cell)
                    return `$${index++}`
                })
                return `(${placeholders.join(', ')})`
            })
            return rows.join(', ')
        }

        values.push(value)
        return `$${index++}`
    })

    return { text, values }
}

const copyAliasKeys = (rows, sql) => {
    const aliases = [...sql.matchAll(/\bas\s+("?)([A-Za-z_][A-Za-z0-9_]*)\1/gi)].map(match => match[2])

    return rows.map(row => {
        for (const alias of aliases) {
            const pgKey = alias.toLowerCase()
            if (alias !== pgKey && Object.hasOwn(row, pgKey) && !Object.hasOwn(row, alias)) {
                row[alias] = row[pgKey]
            }
        }
        return row
    })
}

const normalizeResult = (result, sql) => {
    const rows = copyAliasKeys(result.rows || [], sql)
    const primaryKey = getPrimaryKeyColumn(sql)
    const insertedId = rows[0]?.[primaryKey]

    if (insertedId !== undefined) {
        rows.insertId = insertedId
    }

    rows.affectedRows = result.rowCount
    return rows
}

const runQuery = async (executor, sql, params = []) => {
    let pgSql = convertDateFunctions(sql)
    pgSql = appendReturning(pgSql)

    const { text, values } = convertPlaceholders(pgSql, params)
    const result = await executor.query(text, values)

    return normalizeResult(result, sql)
}

const queryWithExecutor = (executor, sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params
        params = []
    }

    const promise = runQuery(executor, sql, params || [])

    if (typeof callback === 'function') {
        promise.then(rows => callback(null, rows)).catch(error => callback(error))
        return
    }

    return promise
}

const pool = {
    query(sql, params, callback) {
        return queryWithExecutor(pgPool, sql, params, callback)
    },

    async transaction(work) {
        const client = await pgPool.connect()

        try {
            await client.query('BEGIN')
            const tx = {
                query(sql, params, callback) {
                    return queryWithExecutor(client, sql, params, callback)
                },
            }

            const result = await work(tx)
            await client.query('COMMIT')
            return result
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    },

    connect(...args) {
        return pgPool.connect(...args)
    },

    end(...args) {
        return pgPool.end(...args)
    },
}

const connectDB = async () => {
    try {
        await pgPool.query('select now()')
        console.log('db connected')
    } catch (error) {
        console.error('db connection failed', error.message)
    }
}

export {connectDB, pool}
